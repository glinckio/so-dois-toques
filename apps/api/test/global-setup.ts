import { execFileSync } from "node:child_process";
import pg from "pg";
import { urlBancoDeTeste } from "./banco-de-teste.js";

/** Recria o banco de teste e aplica as migrations antes da suíte de integração. */
export default async function setup(): Promise<void> {
  const urlDev = process.env["DATABASE_URL"];
  if (!urlDev) throw new Error("DATABASE_URL não definida");
  const urlTeste = urlBancoDeTeste(urlDev);
  const url = new URL(urlTeste);
  const nome = url.pathname.slice(1);
  // Trava de segurança: nunca recria um banco que não seja de teste.
  if (!/^[a-z0-9_]+_test$/.test(nome))
    throw new Error(`Recusado: "${nome}" não é um banco de teste`);

  url.pathname = "/postgres";
  const cliente = new pg.Client({ connectionString: url.toString() });
  await cliente.connect();
  try {
    await cliente.query(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
    await cliente.query(`CREATE DATABASE "${nome}"`);
  } finally {
    await cliente.end();
  }
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: urlTeste },
  });
}
