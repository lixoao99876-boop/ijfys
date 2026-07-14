import { Module } from "@nestjs/common";
import { BingIndexnowService } from "./bing-indexnow.service";
import { GoogleScService } from "./google-sc.service";
import { YandexWebmasterService } from "./yandex-webmaster.service";
import { SeoService } from "./seo.service";
import { SeoController } from "./seo.controller";

@Module({
  controllers: [SeoController],
  providers: [BingIndexnowService, GoogleScService, YandexWebmasterService, SeoService],
  exports: [SeoService],
})
export class SeoModule {}
