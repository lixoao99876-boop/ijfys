import { BadRequestException, Injectable, ForbiddenException } from "@nestjs/common";
import { CommentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const MAX_LEN = 500;

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  /** 公开列表：只返回 APPROVED */
  async list(filter: { videoId?: string; articleId?: string; page?: number; limit?: number }) {
    const pg = Math.max(1, filter.page ?? 1);
    const lm = Math.min(50, Math.max(1, filter.limit ?? 20));
    const where: Prisma.UserCommentWhereInput = {
      status: CommentStatus.APPROVED,
      isDeleted: false,
    };
    if (filter.videoId) where.videoId = filter.videoId;
    if (filter.articleId) where.articleId = filter.articleId;

    const [rows, total] = await Promise.all([
      this.prisma.userComment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pg - 1) * lm,
        take: lm,
        include: { user: { select: { id: true, username: true, nickname: true, avatar: true } } },
      }),
      this.prisma.userComment.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        content: r.content,
        likes: r.likes,
        parentId: r.parentId,
        createdAt: r.createdAt,
        user: r.user,
      })),
      page: pg,
      limit: lm,
      total,
    };
  }

  /** 用户发评论：默认 PENDING 待审核 */
  async post(
    userId: string,
    data: { videoId?: string; articleId?: string; content: string; parentId?: string },
  ) {
    const content = (data.content ?? "").trim();
    if (!content) throw new BadRequestException("内容为空");
    if (content.length > MAX_LEN) throw new BadRequestException(`内容超过 ${MAX_LEN} 字`);
    if (!data.videoId && !data.articleId) throw new BadRequestException("缺少 videoId 或 articleId");

    return this.prisma.userComment.create({
      data: {
        userId,
        videoId: data.videoId ?? null,
        articleId: data.articleId ?? null,
        parentId: data.parentId ?? null,
        content,
        status: CommentStatus.PENDING,
      },
    });
  }

  /** 评论者本人可删自己评论；普通删除 = isDeleted true */
  async deleteMine(userId: string, commentId: string) {
    const c = await this.prisma.userComment.findUnique({ where: { id: commentId } });
    if (!c) return { ok: true };
    if (c.userId !== userId) throw new ForbiddenException("无权操作");
    await this.prisma.userComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
    return { ok: true };
  }

  // ---------- Admin ----------

  async adminList(filter: { status?: string; page?: number; limit?: number; q?: string }) {
    const pg = Math.max(1, filter.page ?? 1);
    const lm = Math.min(100, Math.max(1, filter.limit ?? 30));
    const where: Prisma.UserCommentWhereInput = {};
    if (filter.status && ["PENDING", "APPROVED", "REJECTED"].includes(filter.status)) {
      where.status = filter.status as CommentStatus;
    }
    if (filter.q) {
      where.content = { contains: filter.q, mode: "insensitive" };
    }
    const [rows, total] = await Promise.all([
      this.prisma.userComment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pg - 1) * lm,
        take: lm,
        include: { user: { select: { id: true, username: true, nickname: true } } },
      }),
      this.prisma.userComment.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        content: r.content,
        status: r.status,
        videoId: r.videoId,
        articleId: r.articleId,
        parentId: r.parentId,
        rejectReason: r.rejectReason,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        user: r.user,
        isDeleted: r.isDeleted,
      })),
      page: pg,
      limit: lm,
      total,
    };
  }

  async moderate(commentId: string, action: "approve" | "reject", reason?: string, reviewer = "admin") {
    const status = action === "approve" ? CommentStatus.APPROVED : CommentStatus.REJECTED;
    await this.prisma.userComment.update({
      where: { id: commentId },
      data: {
        status,
        rejectReason: action === "reject" ? reason ?? null : null,
        reviewedAt: new Date(),
        reviewedBy: reviewer,
      },
    });
    return { ok: true };
  }

  async bulkModerate(ids: string[], action: "approve" | "reject", reason?: string, reviewer = "admin") {
    const status = action === "approve" ? CommentStatus.APPROVED : CommentStatus.REJECTED;
    const r = await this.prisma.userComment.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        rejectReason: action === "reject" ? reason ?? null : null,
        reviewedAt: new Date(),
        reviewedBy: reviewer,
      },
    });
    return { updated: r.count };
  }

  async adminDelete(commentId: string) {
    await this.prisma.userComment.update({
      where: { id: commentId },
      data: { isDeleted: true, status: CommentStatus.REJECTED },
    });
    return { ok: true };
  }
}
