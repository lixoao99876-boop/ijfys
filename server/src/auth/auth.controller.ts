import { BadRequestException, Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { AUTH_COOKIE_NAME, JwtGuard, type AuthedRequest, OptionalAuthGuard } from "./auth.guard";

const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: IS_PROD ? ("strict" as const) : ("lax" as const),
  secure: IS_PROD || process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: 7 * 24 * 3600 * 1000,
};

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 3 } })   // 注册 60s 内最多 3 次/IP
  @Post("register")
  async register(
    @Body() body: { username: string; password: string; email?: string; nickname?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.username || !body?.password) throw new BadRequestException("缺少参数");
    const r = await this.auth.register(body.username, body.password, body.email, body.nickname);
    res.cookie(AUTH_COOKIE_NAME, r.token, COOKIE_OPTIONS);
    return r;
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })  // 登录 60s 内最多 10 次/IP，防爆破
  @Post("login")
  async login(
    @Body() body: { usernameOrEmail: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.usernameOrEmail || !body?.password) throw new BadRequestException("缺少参数");
    const r = await this.auth.login(body.usernameOrEmail, body.password);
    res.cookie(AUTH_COOKIE_NAME, r.token, COOKIE_OPTIONS);
    return r;
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
    return { ok: true };
  }

  @Get("me")
  @UseGuards(OptionalAuthGuard)
  async me(@Req() req: AuthedRequest) {
    if (!req.user) return null;
    const u = await this.auth.getById(req.user.sub);
    return u;
  }

  @Get("me/required")
  @UseGuards(JwtGuard)
  async meRequired(@Req() req: AuthedRequest) {
    return this.auth.getById(req.user!.sub);
  }
}
