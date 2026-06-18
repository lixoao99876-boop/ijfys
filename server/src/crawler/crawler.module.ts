import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { ScoringModule } from "../scoring/scoring.module";
import { CrawlerService } from "./crawler.service";

@Module({
  imports: [ProvidersModule, ScoringModule],
  providers: [CrawlerService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
