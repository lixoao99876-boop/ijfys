import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

async function bootstrap() {
  const isProd = process.env.NODE_ENV === "production";
  const corsOriginsEnv = (process.env.CORS_ORIGINS ?? "").trim();
  const corsOrigins = corsOriginsEnv ? corsOriginsEnv.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: isProd && corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    },
    bufferLogs: true,
  });
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix("api");

  const port = Number(process.env.PORT ?? 4000);
  // 默认只绑 127.0.0.1：外部只能经 nginx（必带 X-Forwarded-For），本机 SSR 直连无 XFF。
  // 如需对外裸监听可显式设 BIND_HOST=0.0.0.0。
  const host = process.env.BIND_HOST ?? "127.0.0.1";
  await app.listen(port, host);
  const log = new Logger("Bootstrap");
  log.log(`🌀 ijfys server on http://${host}:${port}/api (env=${process.env.NODE_ENV ?? "development"})`);
  if (isProd && corsOrigins.length === 0) {
    log.warn("⚠️  CORS_ORIGINS 未设置，将允许所有 origin（建议生产环境配置白名单）");
  }
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
