import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { ProvidersModule } from "./providers/providers.module";
import { CrawlerModule } from "./crawler/crawler.module";
import { ScoringModule } from "./scoring/scoring.module";
import { ApiModule } from "./api/api.module";
import { AdminModule } from "./admin/admin.module";
import { HomeConfigModule } from "./home-config/home-config.module";
import { CollectionModule } from "./collection/collection.module";
import { RecommendationModule } from "./recommendation/recommendation.module";
import { AuthModule } from "./auth/auth.module";
import { SearchModule } from "./search/search.module";
import { CommonModule } from "./common/common.module";

const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== "false";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      // 全局兜底：60 秒内每 IP 最多 200 次
      throttlers: [{ ttl: 60_000, limit: 200 }],
    }),
    PrismaModule,
    AuthModule,
    SearchModule,
    ProvidersModule,
    ScoringModule,
    CrawlerModule,
    ApiModule,
    AdminModule,
    HomeConfigModule,
    CollectionModule,
    RecommendationModule,
    CommonModule,
  ],
  providers: RATE_LIMIT_ENABLED
    ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
    : [],
})
export class AppModule {}
