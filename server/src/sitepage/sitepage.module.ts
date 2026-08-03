import { Module } from "@nestjs/common";
import { SitePageService } from "./sitepage.service";

@Module({
  providers: [SitePageService],
  exports: [SitePageService],
})
export class SitePageModule {}
