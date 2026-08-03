import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService, type JwtPayload } from "./auth.service";

export const AUTH_COOKIE_NAME = "ijfys_token";

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

/** 要求登录的 guard。从 cookie / Authorization header 提取 JWT */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException("请先登录");
    const payload = this.auth.verifyToken(token);
    if (!payload) throw new UnauthorizedException("token 无效");
    req.user = payload;
    return true;
  }
}

/** 可选鉴权：不强制登录，但若有有效 token 就把 user 挂到 req */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (token) {
      const payload = this.auth.verifyToken(token);
      if (payload) req.user = payload;
    }
    return true;
  }
}

export function extractToken(req: Request): string | null {
  // Cookie
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookies = (req as any).cookies as Record<string, string> | undefined;
  if (cookies?.[AUTH_COOKIE_NAME]) return cookies[AUTH_COOKIE_NAME];
  // Authorization Bearer
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
