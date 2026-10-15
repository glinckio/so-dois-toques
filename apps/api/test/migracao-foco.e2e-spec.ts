import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const PASTA = "prisma/migrations";
const ETAPA_12 = "20261015120000_foco_em_aulas";

/** Banco só deste teste, ao lado do banco de teste: "<nome>_migracao_test". */
function urlDoBanco(): URL {
  const url = new URL(process.env["DATABASE_URL"]!);
  const nome = url.pathname.slice(1).replace(/_test$/, "_migracao_test");
  if (!/^[a-z0-9_]+_migracao_test$/.test(nome)) throw new Error(`Banco inesperado: ${nome}`);
  url.pathname = `/${nome}`;
  return url;
}

const sql = (migracao: string) => readFileSync(join(PASTA, migracao, "migration.sql"), "utf8");

/** Recria o banco com as migrações anteriores à Etapa 12 e devolve um cliente nele. */
async function bancoAntesDaEtapa12() {
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
    .filter((m) => /^\d/.test(m) && m < ETAPA_12)
    .sort();
  for (const migracao of anteriores) await cliente.query(sql(migracao));
  return cliente;
}

/** Aulas e mensalidades de verdade: usuário, local próprio, turma, aluno e mensalidade paga. */
async function dadosDeAulas(c: pg.Client) {
  const usuario = (
    await c.query(
      `INSERT INTO "Usuario" (id, nome, email, perfil, "senhaHash", "atualizadoEm")
       VALUES (gen_random_uuid(), 'Dona', 'dona@exemplo.com', 'ADMINISTRADOR', 'x', now()) RETURNING id`,
    )
  ).rows[0].id as string;
  const local = (
    await c.query(
      `INSERT INTO "Local" (id, nome, tipo, "atualizadoEm")
       VALUES (gen_random_uuid(), 'Arena', 'PROPRIA', now()) RETURNING id`,
    )
  ).rows[0].id as string;
  const turma = (
    await c.query(
      `INSERT INTO "Turma" (id, nome, nivel, "localId", "professorId", vagas, inicio, "atualizadaEm")
       VALUES (gen_random_uuid(), 'Iniciantes', 'INICIANTE', $1, $2, 8, '2026-10-01', now()) RETURNING id`,
      [local, usuario],
    )
  ).rows[0].id as string;
  await c.query(
    `INSERT INTO "HorarioTurma" (id, "turmaId", "diaSemana", inicio, fim)
     VALUES (gen_random_uuid(), $1, 2, 1140, 1200)`,
    [turma],
  );
  await c.query(
    `INSERT INTO "Lancamento" (id, tipo, "valorCentavos", forma, data, categoria, descricao, "criadoPorId")
     VALUES (gen_random_uuid(), 'ENTRADA', 15000, 'PIX', '2026-10-05', 'MENSALIDADE', 'Mensalidade', $1)`,
    [usuario],
  );
  const quadra = (await c.query(`SELECT id FROM "Quadra" WHERE ordem = 1`)).rows[0].id as string;
  await c.query(
    `INSERT INTO "Reserva" (id, tipo, "quadraId", data, "horaInicio", "horaFim", motivo, "valorCentavos", "criadaPorId")
     VALUES (gen_random_uuid(), 'BLOQUEIO', $1, '2026-11-03', 8, 10, 'Manutenção', 0, $2)`,
    [quadra, usuario],
  );
  return { usuario, turma };
}

const contar = async (c: pg.Client, tabela: string) =>
  Number((await c.query(`SELECT count(*) FROM "${tabela}"`)).rows[0].count);

describe("Migração da Etapa 12", () => {
  let cliente: pg.Client | undefined;

  afterEach(async () => {
    await cliente?.end();
    cliente = undefined;
  });

  it("FOCO-CA-11: com dados das partes que saem, a migração para sem mudar nada e diz o que achou", async () => {
    cliente = await bancoAntesDaEtapa12();
    const { usuario } = await dadosDeAulas(cliente);
    await cliente.query(
      `INSERT INTO "Produto" (id, nome, "precoCentavos", "atualizadoEm") VALUES (gen_random_uuid(), 'Água', 500, now())`,
    );
    await cliente.query(
      `INSERT INTO "SessaoCaixa" (id, "trocoInicialCentavos", "abertaPorId") VALUES (gen_random_uuid(), 0, $1)`,
      [usuario],
    );

    await expect(cliente.query(sql(ETAPA_12))).rejects.toThrow(
      /Etapa 12 parada: .*1 produto\(s\), 1 turno\(s\) de caixa/,
    );
    expect(await contar(cliente, "Produto")).toBe(1);
    expect(await contar(cliente, "SessaoCaixa")).toBe(1);
    expect(await contar(cliente, "Local")).toBe(1);
    expect(await contar(cliente, "Reserva")).toBe(1);
    const tabelas = await cliente.query(`SELECT to_regclass('"Bloqueio"') AS bloqueio`);
    expect(tabelas.rows[0].bloqueio).toBeNull();
  });

  it("FOCO-CA-11: com reserva de cliente ou turmas no mesmo horário, também para", async () => {
    cliente = await bancoAntesDaEtapa12();
    const { usuario, turma } = await dadosDeAulas(cliente);
    const outra = (
      await cliente.query(
        `INSERT INTO "Turma" (id, nome, nivel, "localId", "professorId", vagas, inicio, "atualizadaEm")
         SELECT gen_random_uuid(), 'Outra', 'AVANCADO', "localId", "professorId", 8, inicio, now()
         FROM "Turma" WHERE id = $1 RETURNING id`,
        [turma],
      )
    ).rows[0].id as string;
    await cliente.query(
      `INSERT INTO "HorarioTurma" (id, "turmaId", "diaSemana", inicio, fim) VALUES (gen_random_uuid(), $1, 2, 1170, 1230)`,
      [outra],
    );
    await cliente.query(
      `INSERT INTO "Reserva" (id, tipo, "quadraId", data, "horaInicio", "horaFim", "clienteNome", "valorCentavos", "criadaPorId")
       SELECT gen_random_uuid(), 'RESERVA', id, '2026-11-04', 18, 19, 'Cliente', 8000, $1 FROM "Quadra" WHERE ordem = 1`,
      [usuario],
    );
    await expect(cliente.query(sql(ETAPA_12))).rejects.toThrow(
      /1 par\(es\) de turmas ativas no mesmo horário, 1 reserva\(s\) de cliente/,
    );
  });

  it("FOCO-CA-11: só com aulas e mensalidades, apaga o que sai e mantém turmas, lançamentos e bloqueios", async () => {
    cliente = await bancoAntesDaEtapa12();
    const { turma } = await dadosDeAulas(cliente);
    await cliente.query(sql(ETAPA_12));

    expect(await contar(cliente, "Turma")).toBe(1);
    expect(await contar(cliente, "HorarioTurma")).toBe(1);
    expect(await contar(cliente, "Lancamento")).toBe(1);
    const bloqueio = await cliente.query(
      `SELECT data::text, "horaInicio", "horaFim", motivo FROM "Bloqueio"`,
    );
    expect(bloqueio.rows).toEqual([
      { data: "2026-11-03", horaInicio: 8, horaFim: 10, motivo: "Manutenção" },
    ]);
    expect((await cliente.query(`SELECT nome FROM "Quadra"`)).rows).toEqual([{ nome: "Quadra" }]);
    const colunas = await cliente.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Turma' AND column_name = 'localId'`,
    );
    expect(colunas.rowCount).toBe(0);
    for (const tabela of [
      "Produto",
      "Venda",
      "SessaoCaixa",
      "Local",
      "Reserva",
      "PagamentoQuadra",
      "FaixaPreco",
    ]) {
      const existe = await cliente.query(`SELECT to_regclass($1) AS t`, [`"${tabela}"`]);
      expect(existe.rows[0].t, tabela).toBeNull();
    }
    // O livro-razão continua imutável.
    await expect(cliente.query(`UPDATE "Lancamento" SET "valorCentavos" = 1`)).rejects.toThrow();
    expect(turma).toEqual(expect.any(String));
  });
});
