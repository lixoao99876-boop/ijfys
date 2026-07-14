import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { EnrichmentService } from "./enrichment.service";

@Controller("enrichment")
export class EnrichmentController {
  constructor(private readonly enrichment: EnrichmentService) {}

  @Post("run")
  run(@Query("limit") limit?: string) {
    const n = Math.max(1, Math.min(10_000, limit ? Number(limit) : 20));
    return this.enrichment.enrichBatch(n);
  }

  @Post("one/:videoId")
  one(@Param("videoId") videoId: string) {
    return this.enrichment.enrichOne(videoId);
  }

  @Get("stats")
  stats() {
    return this.enrichment.stats();
  }
}
