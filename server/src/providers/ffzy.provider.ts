import { Injectable } from "@nestjs/common";
import { BaseAppleCmsProvider } from "./base-apple-cms.provider";

@Injectable()
export class FfzyProvider extends BaseAppleCmsProvider {
  readonly code = "ffzy";
  readonly name = "非凡资源";
  readonly baseUrl =
    process.env.PROVIDER_FFZY_BASE_URL ?? "https://cj.ffzyapi.com/api.php/provide/vod";

  protected override get backupUrls(): string[] {
    const env = process.env.PROVIDER_FFZY_BACKUP_URLS;
    return env ? env.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }
}
