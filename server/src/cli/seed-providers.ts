import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "../app.module";
import { CrawlerService } from "../crawler/crawler.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger("seed");
  await app.get(CrawlerService).ensureProvidersSeeded();
  logger.log("providers 表已同步配置");
  await app.close();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
