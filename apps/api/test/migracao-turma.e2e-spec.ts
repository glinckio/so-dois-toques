import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const PASTA = "prisma/migrations";
const ETAPA_16 = "20261016120000_turma_por_horario";

/** Banco só deste teste, ao lado do banco de teste: "<nome>_turma_test". */
function urlDoBanco(): URL {
  const url = new URL(process.env["DATABASE_URL"]!);
  const nome = url.pathname.slice(1).replace(/_test$/, "_turma_test");
  if (!/^[a-z0-9_]+_turma_test$/.test(nome)) throw new Error(`Banco inesperado: ${nome}`);
  url.pathname = `/${nome}`;
  return url;
}

const sql = (migracao: string) => readFileSync(join(PASTA, migracao, "migration.sql"), "utf8");

/** Recria o banco com as migrações anteriores à Etapa 16 e devolve um cliente nele. */
async function bancoAntesDaEtapa16() {
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
    .filter((m) => /^\d/.test(m) && m < ETAPA_16)
    .sort();
  for (const migracao of anteriores) await cliente.query(sql(migracao));
  return cliente;
}

async function inserir(c: pg.Client, texto: string, valores: unknown[] = []) {
  return (await c.query(texto, valores)).rows[0]?.id as string;
}

/** Professor, aluno e uma turma de segunda (19h) e quarta (20h), com presenças nos dois dias. */
async function turmaDeDoisDias(c: pg.Client) {
  const professor = await inserir(
    c,
    `INSERT INTO "Usuario" (id, nome, email, perfil, "senhaHash", "atualizadoEm")
     VALUES (gen_random_uuid(), 'Prof', 'prof@exemplo.com', 'PROFESSOR', 'x', now()) RETURNING id`,
  );
  const aluno = await inserir(
    c,
    `INSERT INTO "Aluno" (id, nome, "nomeBusca", telefone, "consentimentoEm", "consentimentoPor",
       "consentimentoRegistradoPorId", "atualizadoEm")
     VALUES (gen_random_uuid(), 'Ana', 'ana', '21998765432', now(), 'ALUNO', $1, now()) RETURNING id`,
    [professor],
  );
  const turma = await inserir(
    c,
    `INSERT INTO "Turma" (id, nome, nivel, "professorId", vagas, inicio, "atualizadaEm")
     VALUES (gen_random_uuid(), 'Iniciantes', 'INICIANTE', $1, 8, '2026-09-01', now()) RETURNING id`,
    [professor],
  );
  await c.query(
    `INSERT INTO "HorarioTurma" (id, "turmaId", "diaSemana", inicio, fim) VALUES
       (gen_random_uuid(), $1, 3, 1200, 1260), (gen_random_uuid(), $1, 1, 1140, 1200)`,
    [turma],
  );
  await c.query(
    `INSERT INTO "Matricula" (id, "alunoId", "turmaId", inicio) VALUES (gen_random_uuid(), $1, $2, '2026-09-01')`,
    [aluno, turma],
  );
  // 2026-10-05 é segunda; 2026-10-07 é quarta.
  await c.query(
    `INSERT INTO "Presenca" (id, "turmaId", "alunoId", data, presente, "registradaPorId") VALUES
       (gen_random_uuid(), $1, $2, '2026-10-05', true, $3),
       (gen_random_uuid(), $1, $2, '2026-10-07', false, $3)`,
    [turma, aluno, professor],
  );
  return { professor, aluno, turma };
}

describe("Migração da Etapa 16", () => {
  let cliente: pg.Client | undefined;

  afterEach(async () => {
    await cliente?.end();
    cliente = undefined;
  });

  it("TURMA-CA-06: divide a turma por dia, copia as matrículas, leva as presenças e troca Professor por Atendente", async () => {
    cliente = await bancoAntesDaEtapa16();
    const { professor, aluno, turma } = await turmaDeDoisDias(cliente);
    await cliente.query(sql(ETAPA_16));

    const turmas = (
      await cliente.query(
        `SELECT id, "diaSemana", "horaInicio", "horaFim", nivel, vagas FROM "Turma" ORDER BY "diaSemana"`,
      )
    ).rows;
    expect(turmas).toEqual([
      { id: turma, diaSemana: 1, horaInicio: 1140, horaFim: 1200, nivel: "INICIANTE", vagas: 8 },
      {
        id: expect.any(String),
        diaSemana: 3,
        horaInicio: 1200,
        horaFim: 1260,
        nivel: "INICIANTE",
        vagas: 8,
      },
    ]);
    const quarta = turmas[1].id as string;
    const matriculas = (
      await cliente.query(
        `SELECT "turmaId" FROM "Matricula" WHERE "alunoId" = $1 ORDER BY "turmaId"`,
        [aluno],
      )
    ).rows.map((r) => r.turmaId);
    expect(matriculas.sort()).toEqual([turma, quarta].sort());
    const presencas = (
      await cliente.query(`SELECT "turmaId", data::text AS data FROM "Presenca" ORDER BY data`)
    ).rows;
    expect(presencas).toEqual([
      { turmaId: turma, data: "2026-10-05" },
      { turmaId: quarta, data: "2026-10-07" },
    ]);
    expect(
      (await cliente.query(`SELECT perfil FROM "Usuario" WHERE id = $1`, [professor])).rows[0]
        .perfil,
    ).toBe("ATENDENTE");
    for (const coluna of ["nome", "professorId"]) {
      const existe = await cliente.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'Turma' AND column_name = $1`,
        [coluna],
      );
      expect(existe.rowCount, coluna).toBe(0);
    }
    expect((await cliente.query(`SELECT to_regclass('"HorarioTurma"') AS t`)).rows[0].t).toBeNull();
  });

  it("TURMA-CA-06: com turmas ativas no mesmo horário, para sem mudar nada", async () => {
    cliente = await bancoAntesDaEtapa16();
    const { professor, turma } = await turmaDeDoisDias(cliente);
    const outra = await inserir(
      cliente,
      `INSERT INTO "Turma" (id, nome, nivel, "professorId", vagas, inicio, "atualizadaEm")
       VALUES (gen_random_uuid(), 'Outra', 'AVANCADO', $1, 8, '2026-09-01', now()) RETURNING id`,
      [professor],
    );
    await cliente.query(
      `INSERT INTO "HorarioTurma" (id, "turmaId", "diaSemana", inicio, fim) VALUES (gen_random_uuid(), $1, 1, 1170, 1230)`,
      [outra],
    );
    await expect(cliente.query(sql(ETAPA_16))).rejects.toThrow(/Etapa 16 parada: 1 par/);
    expect(Number((await cliente.query(`SELECT count(*) FROM "HorarioTurma"`)).rows[0].count)).toBe(
      3,
    );
    expect(
      (await cliente.query(`SELECT nome FROM "Turma" WHERE id = $1`, [turma])).rows[0].nome,
    ).toBe("Iniciantes");
  });
});
