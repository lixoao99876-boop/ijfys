import { Controller, Get, Header, Param } from "@nestjs/common";
import { SitemapService } from "./sitemap.service";

/** 全局前缀 api → 实际路径 /api/sitemap/... 由前端 route handler 反代出去 */
@Controller("sitemap")
export class SitemapController {
  constructor(private readonly sitemap: SitemapService) {}

  @Get("index.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  index(): Promise<string> {
    return this.sitemap.buildIndex();
  }

  @Get(":name")
  @Header("Content-Type", "application/xml; charset=utf-8")
  shard(@Param("name") name: string): Promise<string> {
    return this.sitemap.buildShard(name);
  }
}
