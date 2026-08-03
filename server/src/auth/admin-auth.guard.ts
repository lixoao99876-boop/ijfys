import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthedRequest, extractToken } from "./auth.guard";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/**
 * 后台 API 专用 guard：
 *  1) 本机 SSR 内网直连（无 X-Forwarded-For 的 loopback 请求）→ 放行。
 *     依据：Nest 绑 127.0.0.1，外部一切流量必经 nginx 并带 X-Forwarded-For，
 *     只有宿主机内进程（Next SSR / 本地 cron）能无 XFF 直连 :4000。
 *  2) 其余（浏览器写操作、公网直调）→ 必须携带有效 JWT 且角色为 ADMIN/SUPER_ADMIN。
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (isTrustedLocal(req)) return true;

    const token = extractToken(req);
    if (!token) throw new UnauthorizedException("请先登录");
    const payload = this.auth.verifyToken(token);
    if (!payload) throw new UnauthorizedException("登录已失效，请重新登录");
    if (!ADMIN_ROLES.has(payload.role)) throw new ForbiddenException("需要管理员权限");
    req.user = payload;
    return true;
  }
}

function isTrustedLocal(req: AuthedRequest): boolean {
  // 经过任何代理（nginx 会追加）→ 视为外部流量
  if (req.headers["x-forwarded-for"]) return false;
  const ip = req.socket?.remoteAddress ?? "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}
