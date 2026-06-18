import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SearchService } from "./search.service";

const REINDEX_CRON = process.env.MEILI_REINDEX_CRON ?? "0 3 * * *";

/**
 * Meili 自动重建：
 *  - 每天 03:00 全量 reindex（默认；MEILI_REINDEX_CRON 可覆盖；空字符串则不跑）
 *  - 启动后 30 秒延迟做 ensureIndex（不全量重抓）
 */
@Injectable()
export class SearchCron {
  private readonly logger = new Logger("SearchCron");

  constructor(private readonly search: SearchService) {
    setTimeout(() => {
      void this.search.ensureIndex().then((ok) => {
        if (ok) this.logger.log("Meili 索引就绪");
      });
    }, 30_000);
  }

  // 注意：cron 表达式空字符串时 @Cron 装饰器仍会跑，所以加 runtime 判断
  @Cron(REINDEX_CRON, { name: "meili-reindex" })
  async dailyReindex(): Promise<void> {
    if (!REINDEX_CRON || REINDEX_CRON === "disabled") return;
    this.logger.log(`定时 reindex 开始（cron: ${REINDEX_CRON}）`);
    const r = await this.search.reindexAll();
    this.logger.log(`定时 reindex 完成：${r.indexed} 文档`);
  }
}
