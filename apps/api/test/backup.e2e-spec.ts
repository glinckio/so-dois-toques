import type { INestApplication } from "@nestjs/common";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import pg from "pg";
import { urlDoBanco } from "../src/backup/regras.js";
import {
  argumentosPgDump,
  conferirBanco,
  fazerBackup,
  RestauracaoRecusada,
  restaurarBackup,
} from "../src/cli/backup-banco.js";
import { criarApp, criarUsuario } from "./apoio.js";

const DESTINO = "so_dois_toques_test_restauracao";

async function apagarBanco(url: string, nome: string): Promise<void> {
  const cliente = new pg.Client({ connectionString: urlDoBanco(url, "postgres") });
  await cliente.connect();
  try {
    await cliente.query(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
  } finally {
    await cliente.end();
  }
}

describe("Backup e restauração (Etapa 9)", () => {
  const url = process.env["DATABASE_URL"]!;
  let app: INestApplication;
  let pasta: string;
  let arquivo: string;

  beforeAll(async () => {
    app = await criarApp();
    await criarUsuario(app, "ATENDENTE");
    pasta = await mkdtemp(join(tmpdir(), "sdt-backup-"));
    await apagarBanco(url, DESTINO);
  });

  afterAll(async () => {
    await app.close();
    await apagarBanco(url, DESTINO);
    await rm(pasta, { recursive: true, force: true });
  });

  it("LANC-CA-04: gera o arquivo com o nome em São Paulo e a senha fora dos argumentos", async () => {
    const resultado = await fazerBackup({
      databaseUrl: url,
      pasta,
      agora: new Date("2026-10-07T02:30:00Z"),
    });
    arquivo = resultado.arquivo;
    expect(basename(arquivo)).toBe("so_dois_toques-2026-10-06-2330.dump");
    expect(existsSync(arquivo)).toBe(true);
    expect(resultado.conferencia).toEqual(await conferirBanco(url));
    expect(resultado.conferencia.usuarios).toBeGreaterThan(0);

    const senha = new URL(url).password;
    expect(senha).not.toBe("");
    expect(argumentosPgDump("postgresql://sdt@localhost/x", arquivo).join(" ")).not.toContain(
      senha,
    );
  });

  it("LANC-CA-05: a restauração num banco novo confere com o banco de origem", async () => {
    const origem = await conferirBanco(url);
    const restaurado = await restaurarBackup({ databaseUrl: url, arquivo, destino: DESTINO });
    expect(restaurado).toEqual(origem);
  });

  it("LANC-CA-06: recusa banco que já tem tabelas e o próprio banco do sistema", async () => {
    // O destino agora tem as tabelas da restauração anterior.
    await expect(restaurarBackup({ databaseUrl: url, arquivo, destino: DESTINO })).rejects.toThrow(
      RestauracaoRecusada,
    );
    const proprio = new URL(url).pathname.slice(1);
    await expect(restaurarBackup({ databaseUrl: url, arquivo, destino: proprio })).rejects.toThrow(
      "próprio banco do sistema",
    );
    await expect(
      restaurarBackup({ databaseUrl: url, arquivo, destino: 'x"; DROP DATABASE y; --' }),
    ).rejects.toThrow("Nome de banco inválido");
    // Nada mudou no banco restaurado.
    expect(await conferirBanco(urlDoBanco(url, DESTINO))).toEqual(await conferirBanco(url));
  });
});
