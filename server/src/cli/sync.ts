import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { SyncType } from "@prisma/client";
import { AppModule } from "../app.module";
import { CrawlerService } from "../crawler/crawler.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 用法：
 *   pnpm sync                       # 默认手动
 *   pnpm sync --full                # 全量（自动从 sync_state 续传）
 *   pnpm sync --inc                 # 增量
 *   pnpm sync --provider=lzzy       # 限定单 provider
 *   pnpm sync --restart             # 重置 sync_state，强制从 page 1 重头
 *   pnpm sync:lzzy --pages=5
 *   pnpm sync --pages=5
 *   pnpm sync --hours=24
 *   pnpm sync --actor-pages=10 --article-pages=5
 *   pnpm sync --no-actor / --no-article
 *
 * 断点续传：sync_states 表保留每个 provider+entity 的进度，
 *  - 中断后下次再跑 --full 自动从 lastCompletedPage+1 继续
 *  - 同步失败 3 页后自动 PAUSED，cron 下轮续传
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, { abortOnError: false });
  const logger = new Logger("sync");
  const crawler = app.get(CrawlerService);
  const prisma = app.get(PrismaService);

  const type = args.full ? SyncType.FULL : args.inc ? SyncType.INCREMENTAL : SyncType.MANUAL;
  logger.log(
    `开始同步: type=${type} provider=${args.provider ?? "ALL"} pages=${args.pages ?? "auto"} ` +
      `hours=${args.hours ?? "default"} restart=${args.restart ? "YES" : "no"}`,
  );

  const summary = await crawler.runAll({
    type,
    providerCode: args.provider,
    pages: args.pages,
    hours: args.hours,
    actorPages: args.actorPages,
    articlePages: args.articlePages,
    skipActor: args.noActor,
    skipArticle: args.noArticle,
    restart: args.restart,
  });

  for (const [code, s] of Object.entries(summary)) {
    logger.log(
      `[${code}] ok=${s.ok} seen=${s.itemsSeen} ` +
        `+video=${s.videosAdded} ~video=${s.videosUpdated} +source=${s.sourcesAdded} ` +
        `+actor=${s.actorsAdded} ~actor=${s.actorsUpdated} ` +
        `+article=${s.articlesAdded} ~article=${s.articlesUpdated}`,
    );
  }

  // ---- P3 收尾统计 ----
  const [videos, actors, articles, providers, sources, syncStates] = await Promise.all([
    prisma.video.count(),
    prisma.actor.count(),
    prisma.article.count(),
    prisma.provider.count(),
    prisma.source.count(),
    prisma.syncState.findMany({
      include: { provider: { select: { code: true } } },
      orderBy: [{ providerId: "asc" }, { entity: "asc" }],
    }),
  ]);

  logger.log("");
  logger.log("==================== 数据库总览 ====================");
  logger.log(`视频数（聚合后 Video）          : ${videos.toLocaleString()}`);
  logger.log(`演员数                          : ${actors.toLocaleString()}`);
  logger.log(`文章数                          : ${articles.toLocaleString()}`);
  logger.log(`资源站数量                      : ${providers}`);
  logger.log(`线路数量（sources）             : ${sources.toLocaleString()}`);
  logger.log("---------------------- 同步状态 ---------------------");
  for (const s of syncStates) {
    const pages = s.pageCount > 0 ? ` ${s.lastCompletedPage}/${s.pageCount}` : ` ${s.lastCompletedPage}`;
    const err = s.lastError ? ` · err: ${s.lastError.slice(0, 60)}` : "";
    logger.log(
      `[${s.provider.code}] ${s.entity.padEnd(7)} status=${s.status.padEnd(9)} progress=${pages}${err}`,
    );
  }
  logger.log("====================================================");

  await app.close();
}

interface CliArgs {
  full: boolean;
  inc: boolean;
  provider?: string;
  pages?: number;
  hours?: number;
  actorPages?: number;
  articlePages?: number;
  noActor: boolean;
  noArticle: boolean;
  restart: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { full: false, inc: false, noActor: false, noArticle: false, restart: false };
  for (const a of argv) {
    if (a === "--full") out.full = true;
    else if (a === "--inc") out.inc = true;
    else if (a === "--no-actor") out.noActor = true;
    else if (a === "--no-article") out.noArticle = true;
    else if (a === "--restart") out.restart = true;
    else if (a.startsWith("--provider=")) out.provider = a.slice("--provider=".length);
    else if (a.startsWith("--pages=")) out.pages = Number(a.slice("--pages=".length));
    else if (a.startsWith("--hours=")) out.hours = Number(a.slice("--hours=".length));
    else if (a.startsWith("--actor-pages=")) out.actorPages = Number(a.slice("--actor-pages=".length));
    else if (a.startsWith("--article-pages=")) out.articlePages = Number(a.slice("--article-pages=".length));
  }
  return out;
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("sync failed:", e);
  process.exit(1);
});
