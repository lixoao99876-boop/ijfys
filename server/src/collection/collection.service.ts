import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, VideoStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FULL_VIDEO_INCLUDE, toDTO } from "../api/video.mapper";

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  // 公开
  async getBySlug(slug: string) {
    const c = await this.prisma.collection.findUnique({
      where: { slug },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!c || !c.enabled) throw new NotFoundException("collection not found");
    const ids = c.items.map((it) => it.videoId);
    const videos =
      ids.length === 0
        ? []
        : await this.prisma.video.findMany({
            where: { id: { in: ids }, status: VideoStatus.PUBLISHED },
            include: FULL_VIDEO_INCLUDE,
          });
    const map = new Map(videos.map((v) => [v.id, v]));
    const ordered = ids.map((id) => map.get(id)).filter((v): v is NonNullable<typeof v> => !!v);
    return {
      slug: c.slug,
      title: c.title,
      description: c.description,
      cover: c.cover,
      items: ordered.map(toDTO),
    };
  }

  async listPublic() {
    const cs = await this.prisma.collection.findMany({
      where: { enabled: true },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { items: true } } },
    });
    return cs.map((c) => ({
      slug: c.slug,
      title: c.title,
      description: c.description,
      cover: c.cover,
      itemCount: c._count.items,
    }));
  }

  // 后台
  async listAdmin() {
    const cs = await this.prisma.collection.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { items: true } } },
    });
    return cs.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      cover: c.cover,
      enabled: c.enabled,
      itemCount: c._count.items,
      updatedAt: c.updatedAt,
    }));
  }

  async detailAdmin(id: string) {
    const c = await this.prisma.collection.findUnique({
      where: { id },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!c) throw new NotFoundException("collection not found");
    const ids = c.items.map((it) => it.videoId);
    const videos =
      ids.length === 0
        ? []
        : await this.prisma.video.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true, cover: true, category: true, year: true, status: true },
          });
    const map = new Map(videos.map((v) => [v.id, v]));
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      cover: c.cover,
      enabled: c.enabled,
      items: c.items.map((it) => ({
        id: it.id,
        videoId: it.videoId,
        order: it.order,
        video: map.get(it.videoId) ?? null,
      })),
    };
  }

  async create(data: { slug: string; title: string; description?: string; cover?: string }) {
    if (!data.slug || !data.title) throw new BadRequestException("slug/title required");
    return this.prisma.collection.create({
      data: { slug: data.slug, title: data.title, description: data.description, cover: data.cover },
    });
  }

  async update(
    id: string,
    data: Partial<{ slug: string; title: string; description: string | null; cover: string | null; enabled: boolean }>,
  ) {
    const c = await this.prisma.collection.findUnique({ where: { id } });
    if (!c) throw new NotFoundException("collection not found");
    const upd: Prisma.CollectionUpdateInput = {};
    if (data.slug !== undefined) upd.slug = data.slug;
    if (data.title !== undefined) upd.title = data.title;
    if (data.description !== undefined) upd.description = data.description;
    if (data.cover !== undefined) upd.cover = data.cover;
    if (data.enabled !== undefined) upd.enabled = data.enabled;
    await this.prisma.collection.update({ where: { id }, data: upd });
    return { ok: true };
  }

  async remove(id: string) {
    await this.prisma.collection.delete({ where: { id } });
    return { ok: true };
  }

  async addItem(id: string, videoId: string) {
    const c = await this.prisma.collection.findUnique({ where: { id }, include: { items: true } });
    if (!c) throw new NotFoundException("collection not found");
    const v = await this.prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!v) throw new BadRequestException("video not found");
    const maxOrder = c.items.reduce((m, x) => Math.max(m, x.order), 0);
    await this.prisma.collectionItem.upsert({
      where: { collectionId_videoId: { collectionId: id, videoId } },
      create: { collectionId: id, videoId, order: maxOrder + 10 },
      update: {},
    });
    return { ok: true };
  }

  async removeItem(id: string, videoId: string) {
    await this.prisma.collectionItem.deleteMany({ where: { collectionId: id, videoId } });
    return { ok: true };
  }

  async reorderItems(id: string, orderedVideoIds: string[]) {
    await this.prisma.$transaction(
      orderedVideoIds.map((vid, idx) =>
        this.prisma.collectionItem.updateMany({
          where: { collectionId: id, videoId: vid },
          data: { order: (idx + 1) * 10 },
        }),
      ),
    );
    return { ok: true };
  }
}
