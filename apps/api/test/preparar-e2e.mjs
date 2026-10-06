// Prepara a API para os testes ponta a ponta do web: recria o banco "_e2e",
// aplica as migrations e cria o administrador inicial pelo comando admin:criar.
// Usado pelo Playwright (apps/web/playwright.config.ts) antes de subir a API.
import { execFileSync } from "node:child_process";
import pg from "pg";

const url = new URL(process.env.DATABASE_URL ?? "");
const nome = url.pathname.slice(1);
// Trava de segurança: só recria bancos de teste ponta a ponta.
if (!/^[a-z0-9_]+_e2e$/.test(nome)) {
  console.error(`Recusado: "${nome}" não é um banco de testes ponta a ponta`);
  process.exit(1);
}

const admin = new URL(url);
admin.pathname = "/postgres";
const cliente = new pg.Client({ connectionString: admin.toString() });
await cliente.connect();
try {
  await cliente.query(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
  await cliente.query(`CREATE DATABASE "${nome}"`);
} finally {
  await cliente.end();
}

execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], { stdio: "inherit" });
execFileSync("node", ["dist/cli/criar-admin.js"], { stdio: "inherit" });
