import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@prisma/client";
import { ROLES_KEY } from "./roles.decorator";
import type { AuthedRequest } from "./auth.guard";

/**
 * 角色 guard。必须排在 JwtGuard 之后（依赖 req.user 已由 JwtGuard 挂上）。
 * @Roles 未标注时默认放行（交给前置 JwtGuard 只做登录校验）。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw new UnauthorizedException("请先登录");
    if (!required.includes(req.user.role as UserRole)) {
      throw new ForbiddenException("权限不足");
    }
    return true;
  }
}
