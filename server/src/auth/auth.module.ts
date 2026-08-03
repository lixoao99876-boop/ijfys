import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtGuard, OptionalAuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { AdminAuthGuard } from "./admin-auth.guard";

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, OptionalAuthGuard, RolesGuard, AdminAuthGuard],
  exports: [AuthService, JwtGuard, OptionalAuthGuard, RolesGuard, AdminAuthGuard],
})
export class AuthModule {}
