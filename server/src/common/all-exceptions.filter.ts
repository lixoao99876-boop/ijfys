import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";

/**
 * 全局异常过滤器
 *  - 4xx：仅 log warn，body 含 message
 *  - 5xx：log error 完整堆栈 + Sentry（如配置）；body 屏蔽内部细节
 *  - 生产环境不向客户端泄露堆栈
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttp ? exception.getResponse() : { message: "Internal server error" };
    const body = typeof raw === "string" ? { message: raw } : raw;
    const message = (body as { message?: string })?.message ?? "Internal server error";

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status}: ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
      // TODO: Sentry.captureException(exception)
    } else if (status >= 400 && status !== 401 && status !== 404) {
      this.logger.warn(`${req.method} ${req.url} → ${status}: ${message}`);
    }

    const isProd = process.env.NODE_ENV === "production";
    const payload =
      status >= 500
        ? { statusCode: status, message: isProd ? "Internal server error" : message }
        : typeof raw === "string"
          ? { statusCode: status, message: raw }
          : { statusCode: status, ...(raw as Record<string, unknown>) };

    res.status(status).json(payload);
  }
}
