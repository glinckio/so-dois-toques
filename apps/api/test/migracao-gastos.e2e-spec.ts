import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const PASTA = "prisma/migrations";
const ETAPA_17 = "20261016140000_quadras_e_gastos";

/** Banco só deste teste, ao lado do banco de teste: "<nome>_gastos_test". */
function urlDoBanco(): URL {
  const url = new URL(process.env["DATABASE_URL"]!);
  const nome = url.pathname.slice(1).replace(/_test$/, "_gastos_test");
  if (!/^[a-z0-9_]+_gastos_test$/.test(nome)) throw new Error(`Banco inesperado: ${nome}`);
  url.pathname = `/${nome}`;
  return url;
}

const sql = (migracao: string) => readFileSync(join(PASTA, migracao, "migration.sql"), "utf8");

/** Recria o banco com as migrações anteriores à Etapa 17 e devolve um cliente nele. */
async function bancoAntesDaEtapa17() {
  const url = urlDoBanco();
  const nome = url.pathname.slice(1);
  const postgres = new URL(url);
  postgres.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: postgres.toString() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${nome}"`);
  } finally {
    await admin.end();
  }
  const cliente = new pg.Client({ connectionString: url.toString() });
  await cliente.connect();
  const anteriores = readdirSync(PASTA)
    .filter((m) => /^\d/.test(m) && m < ETAPA_17)
    .sort();
  for (const migracao of anteriores) await cliente.query(sql(migracao));
  return cliente;
}

describe("Migração da Etapa 17", () => {
  let cliente: pg.Client | undefined;

  afterEach(async () => {
    await cliente?.end();
    cliente = undefined;
  });

  it("GASTO-CA-07 e GASTO-CA-02: cria o saldo inicial de R$ 600,00 em 16/10/2026 e põe turmas e bloqueios na quadra que já existia", async () => {
    cliente = await bancoAntesDaEtapa17();
    const admin = (
      await cliente.query(
        `INSERT INTO "Usuario" (id, nome, email, perfil, "senhaHash", "atualizadoEm")
         VALUES (gen_random_uuid(), 'Dono', 'dono@exemplo.com', 'ADMINISTRADOR', 'x', now()) RETURNING id`,
      )
    ).rows[0].id as string;
    const turma = (
      await cliente.query(
        `INSERT INTO "Turma" (id, "diaSemana", "horaInicio", "horaFim", nivel, vagas, inicio, "atualizadaEm")
         VALUES (gen_random_uuid(), 2, 1140, 1200, 'INICIANTE', 8, '2026-09-01', now()) RETURNING id`,
      )
    ).rows[0].id as string;
    await cliente.query(
      `INSERT INTO "Bloqueio" (id, data, "horaInicio", "horaFim", motivo, "criadoPorId")
       VALUES (gen_random_uuid(), '2026-11-02', 8, 9, 'Pintura', $1)`,
      [admin],
    );
    const quadra = (await cliente.query(`SELECT id FROM "Quadra"`)).rows[0].id as string;

    await cliente.query(sql(ETAPA_17));

    const saldo = await cliente.query(
      `SELECT tipo::text, "valorCentavos", data::text AS data, descricao, "criadoPorId"
       FROM "Lancamento" WHERE categoria = 'SALDO_INICIAL'`,
    );
    expect(saldo.rows).toEqual([
      {
        tipo: "ENTRADA",
        valorCentavos: 60000,
        data: "2026-10-16",
        descricao: "Saldo que sobrou até 16/10/2026",
        criadoPorId: admin,
      },
    ]);
    // Só um saldo inicial.
    await expect(
      cliente.query(
        `INSERT INTO "Lancamento" (id, tipo, "valorCentavos", forma, data, categoria, descricao, "criadoPorId")
         VALUES (gen_random_uuid(), 'ENTRADA', 100, 'DINHEIRO', '2026-10-17', 'SALDO_INICIAL', 'x', $1)`,
        [admin],
      ),
    ).rejects.toThrow(/Lancamento_saldo_inicial_unico/);

    expect(
      (await cliente.query(`SELECT "quadraId" FROM "Turma" WHERE id = $1`, [turma])).rows[0]
        .quadraId,
    ).toBe(quadra);
    expect((await cliente.query(`SELECT DISTINCT "quadraId" FROM "Bloqueio"`)).rows).toEqual([
      { quadraId: quadra },
    ]);
    // GASTO-CA-01: agora cabe mais de uma quadra.
    await cliente.query(`INSERT INTO "Quadra" (id, nome) VALUES (gen_random_uuid(), 'Arena 2')`);
  });

  it("GASTO-CA-07: sem administrador, a migração não cria o saldo inicial", async () => {
    cliente = await bancoAntesDaEtapa17();
    await cliente.query(sql(ETAPA_17));
    const saldo = await cliente.query(
      `SELECT count(*)::int AS n FROM "Lancamento" WHERE categoria = 'SALDO_INICIAL'`,
    );
    expect(saldo.rows[0].n).toBe(0);
  });
});
