import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ENV } from "./config.module.js";
import type { Env } from "./env.js";
import { configureApp } from "./setup.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const env = app.get<Env>(ENV);
  configureApp(app, env);
  await app.listen(env.PORT);
}

await bootstrap();
