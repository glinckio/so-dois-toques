import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import pg from "pg";
import {
  nomeDoArquivo,
  nomeDoBanco,
  separarSenha,
  urlDoBanco,
  nomeDeBancoValido,
  type Conferencia,
} from "../backup/regras.js";

const executar = promisify(execFile);

/** Argumentos do pg_dump: a URL vai sem senha (LANC-CA-04). */
export function argumentosPgDump(urlSemSenha: string, arquivo: string): string[] {
  return [
    "--format=custom",
    "--no-owner",
    "--no-acl",
    `--file=${arquivo}`,
    `--dbname=${urlSemSenha}`,
  ];
}

export function argumentosPgRestore(urlSemSenha: string, arquivo: string): string[] {
  return ["--no-owner", "--no-acl", "--exit-on-error", `--dbname=${urlSemSenha}`, arquivo];
}

function ambienteComSenha(senha?: string): NodeJS.ProcessEnv {
  const ambiente = { ...process.env };
  delete ambiente["PGPASSWORD"];
  return senha ? { ...ambiente, PGPASSWORD: senha } : ambiente;
}

function semParametroDoPrisma(url: string): string {
  const u = new URL(url);
  u.searchParams.delete("schema");
  return u.toString();
}

async function comCliente<T>(url: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const cliente = new pg.Client({ connectionString: semParametroDoPrisma(url) });
  await cliente.connect();
  try {
    return await fn(cliente);
  } finally {
    await cliente.end();
  }
}

/** Números que mostram se a cópia trouxe tudo (LANC-CA-05). */
export async function conferirBanco(url: string): Promise<Conferencia> {
  return comCliente(url, async (c) => {
    const { rows } = await c.query<Record<keyof Conferencia, string>>(`
      SELECT
        (SELECT count(*) FROM "Usuario") AS usuarios,
        (SELECT count(*) FROM "Aluno") AS alunos,
        (SELECT count(*) FROM "Lancamento") AS lancamentos,
        (SELECT coalesce(sum("valorCentavos"), 0) FROM "Lancamento" WHERE tipo = 'ENTRADA') AS "entradasCentavos",
        (SELECT coalesce(sum("valorCentavos"), 0) FROM "Lancamento" WHERE tipo = 'SAIDA') AS "saidasCentavos",
        (SELECT count(*) FROM "Auditoria") AS auditoria
    `);
    const linha = rows[0]!;
    return {
      usuarios: Number(linha.usuarios),
      alunos: Number(linha.alunos),
      lancamentos: Number(linha.lancamentos),
      entradasCentavos: Number(linha.entradasCentavos),
      saidasCentavos: Number(linha.saidasCentavos),
      auditoria: Number(linha.auditoria),
    };
  });
}

/** pnpm db:backup (LANC-CA-04). */
export async function fazerBackup(opcoes: {
  databaseUrl: string;
  pasta: string;
  agora?: Date;
}): Promise<{ arquivo: string; conferencia: Conferencia }> {
  await mkdir(opcoes.pasta, { recursive: true });
  const arquivo = join(opcoes.pasta, nomeDoArquivo(opcoes.agora ?? new Date()));
  const { url, senha } = separarSenha(opcoes.databaseUrl);
  await executar("pg_dump", argumentosPgDump(url, arquivo), { env: ambienteComSenha(senha) });
  return { arquivo, conferencia: await conferirBanco(opcoes.databaseUrl) };
}

export class RestauracaoRecusada extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "RestauracaoRecusada";
  }
}

/**
 * pnpm db:restaurar (LANC-CA-05 e 06): cria o banco de destino no mesmo
 * servidor e restaura a cópia nele. Nunca restaura por cima de dados.
 */
export async function restaurarBackup(opcoes: {
  databaseUrl: string;
  arquivo: string;
  destino: string;
}): Promise<Conferencia> {
  const { databaseUrl, arquivo, destino } = opcoes;
  if (!nomeDeBancoValido(destino)) {
    throw new RestauracaoRecusada(
      "Nome de banco inválido: use letras minúsculas, números e _, começando por letra.",
    );
  }
  if (destino === nomeDoBanco(databaseUrl)) {
    throw new RestauracaoRecusada(
      "O destino não pode ser o próprio banco do sistema (DATABASE_URL).",
    );
  }

  const existe = await comCliente(urlDoBanco(databaseUrl, "postgres"), async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [destino]);
    if (!rowCount) await c.query(`CREATE DATABASE "${destino}"`);
    return Boolean(rowCount);
  });
  const urlDestino = urlDoBanco(databaseUrl, destino);
  if (existe) {
    const tabelas = await comCliente(urlDestino, async (c) => {
      const { rows } = await c.query<{ total: string }>(
        "SELECT count(*) AS total FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')",
      );
      return Number(rows[0]!.total);
    });
    if (tabelas > 0) {
      throw new RestauracaoRecusada(
        `O banco "${destino}" já tem tabelas. Restaure sempre num banco novo e vazio.`,
      );
    }
  }

  const { url, senha } = separarSenha(urlDestino);
  await executar("pg_restore", argumentosPgRestore(url, arquivo), { env: ambienteComSenha(senha) });
  return conferirBanco(urlDestino);
}
