import { Module } from "@nestjs/common";
import { HomeConfigService } from "./home-config.service";

@Module({
  providers: [HomeConfigService],
  exports: [HomeConfigService],
})
export class HomeConfigModule {}
