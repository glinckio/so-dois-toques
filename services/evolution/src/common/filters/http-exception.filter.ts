import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

interface AxiosErrorLike {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let detail: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === "object" && payload !== null) {
        const p = payload as Record<string, unknown>;
        const rawMsg = p.message;
        message = Array.isArray(rawMsg)
          ? (rawMsg as string[]).join("; ")
          : (rawMsg as string) || exception.message;
        if (p.detail) detail = String(p.detail);
      } else {
        message = String(payload);
      }
    } else {
      const axiosErr = exception as AxiosErrorLike;
      if (axiosErr?.response?.status != null) {
        status = axiosErr.response.status;
        const data = axiosErr.response.data;
        message =
          typeof data === "object" && data !== null && "message" in data
            ? String((data as { message: unknown }).message)
            : axiosErr.message || "Request failed";
        if (typeof data === "object" && data !== null) {
          const d = data as Record<string, unknown>;
          if (d.error != null) detail = String(d.error);
          else if (
            d.response != null &&
            typeof d.response === "object" &&
            (d.response as Record<string, unknown>).message != null
          )
            detail = JSON.stringify((d.response as { message: unknown }).message);
          else if (Object.keys(d).length > 0 && !detail) detail = JSON.stringify(data);
        }
      } else if (exception instanceof Error) {
        message = exception.message;
        const errWithCode = exception as Error & { statusCode?: number; detail?: unknown };
        if (typeof errWithCode.statusCode === "number") {
          status = errWithCode.statusCode;
          if (errWithCode.detail != null)
            detail =
              typeof errWithCode.detail === "string"
                ? errWithCode.detail
                : JSON.stringify(errWithCode.detail);
        }
        this.logger.error(exception.stack);
      }
    }

    const body = {
      statusCode: status,
      message,
      ...(detail && { detail }),
    };

    res.status(status).json(body);
  }
}
