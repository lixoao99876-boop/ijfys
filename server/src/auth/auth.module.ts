import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtGuard, OptionalAuthGuard } from "./auth.guard";

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, OptionalAuthGuard],
  exports: [AuthService, JwtGuard, OptionalAuthGuard],
})
export class AuthModule {}
