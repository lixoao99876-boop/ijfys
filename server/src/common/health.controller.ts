import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SearchService } from "../search/search.service";

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  /** Liveness：进程是否存活 */
  @Get("health")
  liveness() {
    return { status: "ok", ts: new Date().toISOString() };
  }

  /** Readiness：依赖（DB / Meili）是否就绪 */
  @Get("ready")
  async readiness() {
    const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {};

    const t1 = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = { ok: true, latencyMs: Date.now() - t1 };
    } catch (e) {
      checks.db = { ok: false, detail: e instanceof Error ? e.message : "db unreachable" };
    }

    const t2 = Date.now();
    try {
      const s = await this.search.stats();
      checks.meili = { ok: s.available, latencyMs: Date.now() - t2, detail: `${s.count} docs` };
    } catch (e) {
      checks.meili = { ok: false, detail: e instanceof Error ? e.message : "meili unreachable" };
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    return { status: allOk ? "ok" : "degraded", checks };
  }
}
