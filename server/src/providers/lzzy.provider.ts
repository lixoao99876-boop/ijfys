import { Injectable } from "@nestjs/common";
import { BaseAppleCmsProvider } from "./base-apple-cms.provider";

@Injectable()
export class LzzyProvider extends BaseAppleCmsProvider {
  readonly code = "lzzy";
  readonly name = "量子资源";
  readonly baseUrl =
    process.env.PROVIDER_LZZY_BASE_URL ?? "https://cj.lziapi.com/api.php/provide/vod";

  /** 量子资源支持演员 + 资讯接口 */
  readonly supportsActor = true;
  readonly supportsArticle = true;

  protected override get backupUrls(): string[] {
    const env = process.env.PROVIDER_LZZY_BACKUP_URLS;
    if (env) return env.split(",").map((s) => s.trim()).filter(Boolean);
    return ["https://cj.lzcaiji.com/api.php/provide/vod"];
  }
}
