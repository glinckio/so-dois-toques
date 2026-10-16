-- Etapa 16: a turma é um dia e um horário. Turma de vários dias vira uma turma por dia
-- (com as matrículas copiadas e cada presença na turma do dia certo); saem o nome da
-- turma, o professor da turma e o perfil Professor (quem era professor vira atendente).

-- TURMA-CA-06: se duas turmas ativas dividirem horário depois de divididas, para sem
-- mudar nada. A Etapa 14 já recusa isso ao salvar; aqui é só a rede de segurança.
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM "HorarioTurma" a
    JOIN "Turma" ta ON ta.id = a."turmaId" AND ta.ativa
    JOIN "HorarioTurma" b ON b."diaSemana" = a."diaSemana" AND b.id > a.id
      AND a.inicio < b.fim AND b.inicio < a.fim
    JOIN "Turma" tb ON tb.id = b."turmaId" AND tb.ativa;
  IF n > 0 THEN
    RAISE EXCEPTION 'Etapa 16 parada: % par(es) de horários de turmas ativas no mesmo horário. Ajuste as turmas antes de migrar.', n;
  END IF;
END $$;

ALTER TABLE "Turma" ADD COLUMN "diaSemana" SMALLINT;
ALTER TABLE "Turma" ADD COLUMN "horaInicio" SMALLINT;
ALTER TABLE "Turma" ADD COLUMN "horaFim" SMALLINT;

DO $$
DECLARE
  t RECORD;
  h RECORD;
  primeiro boolean;
  nova uuid;
BEGIN
  FOR t IN SELECT * FROM "Turma" LOOP
    primeiro := true;
    FOR h IN SELECT * FROM "HorarioTurma" WHERE "turmaId" = t.id ORDER BY "diaSemana", inicio LOOP
      IF primeiro THEN
        -- O primeiro horário fica na própria turma.
        UPDATE "Turma" SET "diaSemana" = h."diaSemana", "horaInicio" = h.inicio, "horaFim" = h.fim
          WHERE id = t.id;
        primeiro := false;
      ELSE
        nova := gen_random_uuid();
        INSERT INTO "Turma" ("id", "nome", "nivel", "professorId", "vagas", "ativa", "inicio",
          "encerradaEm", "criadaEm", "atualizadaEm", "diaSemana", "horaInicio", "horaFim")
        VALUES (nova, t."nome", t."nivel", t."professorId", t."vagas", t."ativa", t."inicio",
          t."encerradaEm", t."criadaEm", t."atualizadaEm", h."diaSemana", h.inicio, h.fim);
        INSERT INTO "Matricula" ("id", "alunoId", "turmaId", "inicio", "fim", "criadaEm")
          SELECT gen_random_uuid(), m."alunoId", nova, m."inicio", m."fim", m."criadaEm"
          FROM "Matricula" m WHERE m."turmaId" = t.id;
        -- Cada presença vai para a turma do dia da semana em que a aula aconteceu.
        UPDATE "Presenca" SET "turmaId" = nova
          WHERE "turmaId" = t.id AND EXTRACT(DOW FROM "data") = h."diaSemana";
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Turma sem nenhum horário (não deveria existir): fica encerrada, segunda às 05:00.
UPDATE "Turma" SET "diaSemana" = 1, "horaInicio" = 300, "horaFim" = 360, "ativa" = false,
  "encerradaEm" = COALESCE("encerradaEm", now())
  WHERE "diaSemana" IS NULL;

ALTER TABLE "Turma" ALTER COLUMN "diaSemana" SET NOT NULL;
ALTER TABLE "Turma" ALTER COLUMN "horaInicio" SET NOT NULL;
ALTER TABLE "Turma" ALTER COLUMN "horaFim" SET NOT NULL;
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_horario_faixa" CHECK (
  "diaSemana" BETWEEN 0 AND 6 AND "horaInicio" >= 300 AND "horaFim" <= 1439 AND "horaFim" > "horaInicio"
);

DROP TABLE "HorarioTurma";
DROP INDEX "Turma_professorId_ativa_idx";
ALTER TABLE "Turma" DROP CONSTRAINT "Turma_professorId_fkey";
ALTER TABLE "Turma" DROP COLUMN "professorId";
ALTER TABLE "Turma" DROP COLUMN "nome";
CREATE INDEX "Turma_diaSemana_ativa_idx" ON "Turma"("diaSemana", "ativa");

-- Sai o perfil Professor.
UPDATE "Usuario" SET "perfil" = 'ATENDENTE' WHERE "perfil" = 'PROFESSOR';
CREATE TYPE "Perfil_new" AS ENUM ('ADMINISTRADOR', 'ATENDENTE');
ALTER TABLE "Usuario" ALTER COLUMN "perfil" TYPE "Perfil_new" USING ("perfil"::text::"Perfil_new");
ALTER TYPE "Perfil" RENAME TO "Perfil_old";
ALTER TYPE "Perfil_new" RENAME TO "Perfil";
DROP TYPE "Perfil_old";
