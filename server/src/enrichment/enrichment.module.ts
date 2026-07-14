import { Module } from "@nestjs/common";
import { SeoModule } from "../seo/seo.module";
import { TmdbService } from "./tmdb.service";
import { EnrichmentService } from "./enrichment.service";
import { EnrichmentController } from "./enrichment.controller";

@Module({
  imports: [SeoModule],
  controllers: [EnrichmentController],
  providers: [TmdbService, EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
