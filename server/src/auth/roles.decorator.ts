import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@prisma/client";

export const ROLES_KEY = "required_roles";

/** 标注某路由/控制器要求的角色（任一命中即放行）。需配合 RolesGuard + JwtGuard 使用 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
