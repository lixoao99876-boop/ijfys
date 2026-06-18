import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { JwtGuard, OptionalAuthGuard, type AuthedRequest } from "../auth/auth.guard";

@Controller("user")
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get("me")
  @UseGuards(OptionalAuthGuard)
  me(@Req() req: AuthedRequest) {
    return req.user ? { id: req.user.sub, username: req.user.username, role: req.user.role } : null;
  }

  // ---------- 收藏 ----------
  @Get("favorites")
  @UseGuards(JwtGuard)
  favorites(@Req() req: AuthedRequest, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.user.favorites(req.user!.sub, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Post("favorites")
  @UseGuards(JwtGuard)
  addFavorite(@Req() req: AuthedRequest, @Body() body: { videoId: string }) {
    return this.user.addFavorite(req.user!.sub, body.videoId);
  }

  @Delete("favorites/:videoId")
  @UseGuards(JwtGuard)
  removeFavorite(@Req() req: AuthedRequest, @Param("videoId") videoId: string) {
    return this.user.removeFavorite(req.user!.sub, videoId);
  }

  @Get("favorites/:videoId/check")
  @UseGuards(OptionalAuthGuard)
  isFavorite(@Req() req: AuthedRequest, @Param("videoId") videoId: string) {
    if (!req.user) return { favorited: false };
    return this.user.isFavorite(req.user.sub, videoId);
  }

  // ---------- 历史 ----------
  @Get("histories")
  @UseGuards(JwtGuard)
  histories(@Req() req: AuthedRequest, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.user.histories(req.user!.sub, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Post("histories")
  @UseGuards(JwtGuard)
  upsertHistory(
    @Req() req: AuthedRequest,
    @Body() body: { videoId: string; episodeId?: string; episodeName?: string; progress: number; duration: number },
  ) {
    return this.user.upsertHistory(req.user!.sub, body);
  }

  @Post("histories/merge")
  @UseGuards(JwtGuard)
  mergeHistories(@Req() req: AuthedRequest, @Body() body: { items: Array<{ videoId: string; episodeId?: string; episodeName?: string; progress: number; duration: number; updatedAt?: number }> }) {
    return this.user.mergeHistories(req.user!.sub, body?.items ?? []);
  }

  @Delete("histories/:videoId")
  @UseGuards(JwtGuard)
  removeHistory(@Req() req: AuthedRequest, @Param("videoId") videoId: string) {
    return this.user.removeHistory(req.user!.sub, videoId);
  }

  @Delete("histories")
  @UseGuards(JwtGuard)
  clearHistory(@Req() req: AuthedRequest) {
    return this.user.clearHistory(req.user!.sub);
  }

  // ---------- 评分 ----------
  @Get("ratings/:videoId")
  @UseGuards(JwtGuard)
  myRating(@Req() req: AuthedRequest, @Param("videoId") videoId: string) {
    return this.user.myRating(req.user!.sub, videoId);
  }

  @Post("ratings")
  @UseGuards(JwtGuard)
  rate(@Req() req: AuthedRequest, @Body() body: { videoId: string; rating: number; comment?: string }) {
    return this.user.rate(req.user!.sub, body);
  }

  @Get("ratings")
  @UseGuards(JwtGuard)
  myRatings(@Req() req: AuthedRequest) {
    return this.user.myRatings(req.user!.sub);
  }
}
