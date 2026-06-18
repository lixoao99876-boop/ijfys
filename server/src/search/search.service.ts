import { Injectable, Logger } from "@nestjs/common";
import axios, { type AxiosInstance } from "axios";
import { VideoStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const HOST = process.env.MEILI_HOST ?? "http://127.0.0.1:7700";
const API_KEY = process.env.MEILI_API_KEY;
const INDEX_NAME = "videos";

interface VideoDoc {
  id: string;
  title: string;
  originalTitle: string | null;
  director: string | null;
  actors: string[];
  genres: string[];
  region: string | null;
  category: string;
  year: number | null;
  cover: string | null;
  remarks: string | null;
  score: number;
  playCount: number;
  sourceUpdatedAt: number | null;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly http: AxiosInstance;
  private indexInitialized = false;
  private available: boolean | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.http = axios.create({
      baseURL: HOST,
      timeout: 30_000,
      headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
    });
  }

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      await this.http.get("/health");
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  async ensureIndex(): Promise<boolean> {
    if (this.indexInitialized) return true;
    if (!(await this.isAvailable())) return false;
    try {
      // 创建索引（幂等）
      await this.http.post("/indexes", { uid: INDEX_NAME, primaryKey: "id" }).catch(() => {});
      // 配置 (Meili 1.x: PATCH /indexes/:uid/settings)
      await this.http.patch(`/indexes/${INDEX_NAME}/settings`, {
        searchableAttributes: ["title", "originalTitle", "actors", "director", "genres"],
        filterableAttributes: ["category", "year", "region"],
        sortableAttributes: ["playCount", "score", "sourceUpdatedAt", "year"],
        rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness", "playCount:desc", "score:desc"],
      });
      this.indexInitialized = true;
      return true;
    } catch (e) {
      this.logger.warn(`Meili 配置失败: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }

  async reindexAll(batchSize = 5000): Promise<{ indexed: number }> {
    if (!(await this.ensureIndex())) {
      this.logger.warn("Meili 不可用，跳过 reindex");
      return { indexed: 0 };
    }
    // 清空旧文档
    try {
      await this.http.delete(`/indexes/${INDEX_NAME}/documents`);
    } catch { /* noop */ }

    let cursor: string | null = null;
    let total = 0;
    type Row = {
      id: string; title: string; originalTitle: string | null; director: string | null;
      actors: string[]; genres: string[]; region: string | null; category: string;
      year: number | null; cover: string | null; remarks: string | null;
      score: number; playCount: number; sourceUpdatedAt: Date | null;
    };
    for (;;) {
      const rows: Row[] = await this.prisma.video.findMany({
        where: { status: VideoStatus.PUBLISHED },
        select: {
          id: true, title: true, originalTitle: true, director: true,
          actors: true, genres: true, region: true, category: true, year: true,
          cover: true, remarks: true, score: true, playCount: true, sourceUpdatedAt: true,
        },
        orderBy: { id: "asc" },
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        take: batchSize,
      });
      if (rows.length === 0) break;
      const docs: VideoDoc[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        originalTitle: r.originalTitle,
        director: r.director,
        actors: r.actors,
        genres: r.genres,
        region: r.region,
        category: r.category,
        year: r.year,
        cover: r.cover,
        remarks: r.remarks,
        score: r.score,
        playCount: r.playCount,
        sourceUpdatedAt: r.sourceUpdatedAt ? r.sourceUpdatedAt.getTime() : null,
      }));
      try {
        await this.http.post(`/indexes/${INDEX_NAME}/documents`, docs);
      } catch (e) {
        this.logger.warn(`批 ${total} 索引失败: ${e instanceof Error ? e.message : e}`);
        break;
      }
      total += rows.length;
      cursor = rows[rows.length - 1].id;
      if (total % 25000 < batchSize) this.logger.log(`reindex ${total}...`);
    }
    this.logger.log(`reindex 完成：${total} 文档`);
    return { indexed: total };
  }

  async upsertOne(videoId: string): Promise<void> {
    if (!(await this.ensureIndex())) return;
    const r = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true, status: true, title: true, originalTitle: true, director: true,
        actors: true, genres: true, region: true, category: true, year: true,
        cover: true, remarks: true, score: true, playCount: true, sourceUpdatedAt: true,
      },
    });
    if (!r) return;
    if (r.status !== VideoStatus.PUBLISHED) {
      await this.http.delete(`/indexes/${INDEX_NAME}/documents/${videoId}`).catch(() => {});
      return;
    }
    const doc: VideoDoc = {
      id: r.id,
      title: r.title,
      originalTitle: r.originalTitle,
      director: r.director,
      actors: r.actors,
      genres: r.genres,
      region: r.region,
      category: r.category,
      year: r.year,
      cover: r.cover,
      remarks: r.remarks,
      score: r.score,
      playCount: r.playCount,
      sourceUpdatedAt: r.sourceUpdatedAt ? r.sourceUpdatedAt.getTime() : null,
    };
    await this.http.post(`/indexes/${INDEX_NAME}/documents`, [doc]).catch((e) => {
      this.logger.warn(`Meili upsert ${videoId} 失败: ${e instanceof Error ? e.message : e}`);
    });
  }

  async search(
    q: string,
    page = 1,
    limit = 20,
  ): Promise<{ hits: VideoDoc[]; total: number; page: number; limit: number } | null> {
    if (!(await this.ensureIndex())) return null;
    try {
      const res = await this.http.post<{ hits: VideoDoc[]; estimatedTotalHits: number }>(
        `/indexes/${INDEX_NAME}/search`,
        { q, limit, offset: (Math.max(1, page) - 1) * limit },
      );
      return {
        hits: res.data.hits,
        total: res.data.estimatedTotalHits ?? res.data.hits.length,
        page,
        limit,
      };
    } catch (e) {
      this.logger.warn(`Meili search 失败: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async stats(): Promise<{ available: boolean; count: number; isIndexing?: boolean }> {
    if (!(await this.isAvailable())) return { available: false, count: 0 };
    try {
      const res = await this.http.get(`/indexes/${INDEX_NAME}/stats`);
      return {
        available: true,
        count: res.data.numberOfDocuments ?? 0,
        isIndexing: res.data.isIndexing ?? false,
      };
    } catch {
      return { available: true, count: 0 };
    }
  }
}
