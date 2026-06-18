import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CommentService } from "./comment.service";
import { JwtGuard, type AuthedRequest } from "../auth/auth.guard";

@Controller()
export class CommentController {
  constructor(private readonly comment: CommentService) {}

  // 公网读
  @Get("comments")
  list(
    @Query("videoId") videoId?: string,
    @Query("articleId") articleId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    if (!videoId && !articleId) throw new BadRequestException("videoId or articleId required");
    return this.comment.list({
      videoId,
      articleId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // 登录写
  @Throttle({ default: { ttl: 60_000, limit: 5 } })  // 1 分钟最多发 5 条评论
  @Post("comments")
  @UseGuards(JwtGuard)
  post(
    @Req() req: AuthedRequest,
    @Body() body: { videoId?: string; articleId?: string; content: string; parentId?: string },
  ) {
    return this.comment.post(req.user!.sub, body);
  }

  @Delete("comments/:id")
  @UseGuards(JwtGuard)
  deleteMine(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.comment.deleteMine(req.user!.sub, id);
  }
}
