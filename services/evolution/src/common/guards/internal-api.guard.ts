import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { segredosIguais } from "./comparar";

/** CHAT-CA-02: rotas internas só com a chave da API do sistema. */
@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers["x-internal-api-key"];
    if (!segredosIguais(key, this.config.get<string>("INTERNAL_API_KEY"))) {
      throw new UnauthorizedException("Invalid or missing internal API key");
    }
    return true;
  }
}
