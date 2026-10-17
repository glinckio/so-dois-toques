import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { segredosIguais } from "./comparar";

/** CHAT-CA-02: o webhook só aceita o Evolution, que manda o token em ?token=. */
@Injectable()
export class WebhookTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!segredosIguais(request.query["token"], this.config.get<string>("WEBHOOK_TOKEN"))) {
      throw new UnauthorizedException("Invalid or missing webhook token");
    }
    return true;
  }
}
