import { Module } from "@nestjs/common";
import { CrawlerModule } from "../crawler/crawler.module";
import { HomeConfigModule } from "../home-config/home-config.module";
import { CollectionModule } from "../collection/collection.module";
import { ApiModule } from "../api/api.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminLogService } from "./admin-log.service";

@Module({
  imports: [CrawlerModule, HomeConfigModule, CollectionModule, ApiModule],
  controllers: [AdminController],
  providers: [AdminService, AdminLogService],
  exports: [AdminLogService],
})
export class AdminModule {}
