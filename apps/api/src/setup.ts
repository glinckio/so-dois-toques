import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import type { Env } from "./env.js";

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
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });
  app.enableShutdownHooks();
}
