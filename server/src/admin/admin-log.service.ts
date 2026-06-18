import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 后台操作日志服务。
 * 在所有 admin "写"操作（同步触发 / 启停资源站 / 编辑 / 删除 / 上下架）后调用。
 * 鉴权未接入时 actor 固定 "admin"，后续接入 JWT 后从请求上下文取。
 */
@Injectable()
export class AdminLogService {
  private readonly logger = new Logger(AdminLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    action: string;
    target?: string;
    detail?: unknown;
    actor?: string;
    ip?: string;
  }): Promise<void> {
    try {
      await this.prisma.adminLog.create({
        data: {
          actor: params.actor ?? "admin",
          action: params.action,
          target: params.target ?? null,
          detail: params.detail ? JSON.stringify(params.detail) : null,
          ip: params.ip ?? null,
        },
      });
    } catch (e) {
      // 日志写入失败不应阻塞业务流程
      this.logger.warn(`adminLog 写入失败: ${e instanceof Error ? e.message : e}`);
    }
  }
}
