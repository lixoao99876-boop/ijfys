import { Module } from "@nestjs/common";
import { CoverQualityService } from "./cover-quality.service";

@Module({
  providers: [CoverQualityService],
  exports: [CoverQualityService],
})
export class CoverQualityModule {}
