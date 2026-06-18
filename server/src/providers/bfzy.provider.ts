import { Injectable } from "@nestjs/common";
import { BaseAppleCmsProvider } from "./base-apple-cms.provider";

@Injectable()
export class BfzyProvider extends BaseAppleCmsProvider {
  readonly code = "bfzy";
  readonly name = "暴风资源";
  readonly baseUrl =
    process.env.PROVIDER_BFZY_BASE_URL ?? "https://bfzyapi.com/api.php/provide/vod";

  protected override get backupUrls(): string[] {
    const env = process.env.PROVIDER_BFZY_BACKUP_URLS;
    return env ? env.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }
}
