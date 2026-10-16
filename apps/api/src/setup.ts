import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { json } from "express";
import helmet from "helmet";
import type { Env } from "./env.js";

/** CHAT-CA-06: só o envio de mensagem do chat recebe arquivo (até 10 MB, em base64). */
export const ROTA_DE_ENVIO_DO_CHAT = /^\/chat\/conversas\/\d+\/mensagens$/;

/**
 * Configuração de segurança comum ao servidor e aos testes, para que os
 * testes verifiquem exatamente o que roda em produção.
 */
export function configureApp(app: INestApplication, env: Env): void {
  (app as NestExpressApplication).disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
      xFrameOptions: { action: "deny" },
    }),
  );
  // Corpo grande só no envio do chat. Fica antes do leitor padrão do Nest (100 kB),
  // que pula o corpo já lido. O nome próprio importa: o Nest não registra o leitor
  // dele se já houver uma camada chamada "jsonParser".
  const leitorGrande = json({ limit: "15mb" });
  app.use(
    ROTA_DE_ENVIO_DO_CHAT,
    function corpoDoEnvioDoChat(req: unknown, res: unknown, next: unknown) {
      return (leitorGrande as (...args: unknown[]) => void)(req, res, next);
    },
  );
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });
  app.enableShutdownHooks();
}
