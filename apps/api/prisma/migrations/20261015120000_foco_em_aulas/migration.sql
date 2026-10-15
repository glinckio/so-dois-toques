-- Etapa 14: foco em aulas. Saem estoque, caixa (turnos e avulsos), quadras parceiras
-- e aluguel de quadra; a agenda da única quadra fica só com bloqueios (as aulas vêm
-- das turmas).

-- FOCO-CA-11: a migração para, sem mudar nada, se houver dado real das partes que saem.
DO $$
DECLARE
  achados text[] := '{}';
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM "Produto";
  IF n > 0 THEN achados := achados || format('%s produto(s)', n); END IF;
  SELECT count(*) INTO n FROM "Venda";
  IF n > 0 THEN achados := achados || format('%s venda(s)', n); END IF;
  SELECT count(*) INTO n FROM "Compra";
  IF n > 0 THEN achados := achados || format('%s compra(s)', n); END IF;
  SELECT count(*) INTO n FROM "MovimentoEstoque";
  IF n > 0 THEN achados := achados || format('%s movimento(s) de estoque', n); END IF;
  SELECT count(*) INTO n FROM "SessaoCaixa";
  IF n > 0 THEN achados := achados || format('%s turno(s) de caixa', n); END IF;
  SELECT count(*) INTO n FROM "Lancamento" l
    LEFT JOIN "Lancamento" o ON o.id = l."estornoDeId"
    WHERE NOT (l.categoria = 'MENSALIDADE'
      OR (l.categoria = 'ESTORNO' AND o.categoria IS NOT DISTINCT FROM 'MENSALIDADE'));
  IF n > 0 THEN achados := achados || format('%s lançamento(s) que não são de mensalidade', n); END IF;
  SELECT count(*) INTO n FROM "PagamentoQuadra";
  IF n > 0 THEN achados := achados || format('%s pagamento(s) a quadra parceira', n); END IF;
  SELECT count(*) INTO n FROM "Local" WHERE tipo = 'PARCEIRA';
  IF n > 0 THEN achados := achados || format('%s local(is) parceiro(s)', n); END IF;
  SELECT count(DISTINCT "localId") INTO n FROM "Turma";
  IF n > 1 THEN achados := achados || format('turmas em %s locais diferentes', n); END IF;
  SELECT count(*) INTO n FROM "HorarioTurma" a
    JOIN "Turma" ta ON ta.id = a."turmaId" AND ta.ativa
    JOIN "HorarioTurma" b ON b."diaSemana" = a."diaSemana" AND b."turmaId" > a."turmaId"
      AND a.inicio < b.fim AND b.inicio < a.fim
    JOIN "Turma" tb ON tb.id = b."turmaId" AND tb.ativa;
  IF n > 0 THEN achados := achados || format('%s par(es) de turmas ativas no mesmo horário', n); END IF;
  SELECT count(*) INTO n FROM "Reserva" WHERE tipo = 'RESERVA';
  IF n > 0 THEN achados := achados || format('%s reserva(s) de cliente', n); END IF;
  SELECT count(*) INTO n FROM "SerieReserva" WHERE tipo = 'RESERVA';
  IF n > 0 THEN achados := achados || format('%s reserva(s) fixa(s) de cliente', n); END IF;
  SELECT count(*) INTO n FROM "Reserva" r JOIN "Quadra" q ON q.id = r."quadraId"
    WHERE q.ordem <> 1 OR r."horaInicio" < 5;
  IF n > 0 THEN achados := achados || format('%s bloqueio(s) na segunda quadra ou antes das 5h', n); END IF;
  SELECT count(*) INTO n FROM "SerieReserva" s JOIN "Quadra" q ON q.id = s."quadraId"
    WHERE q.ordem <> 1 OR s."horaInicio" < 5;
  IF n > 0 THEN achados := achados || format('%s bloqueio(s) semanal(is) na segunda quadra ou antes das 5h', n); END IF;

  IF array_length(achados, 1) > 0 THEN
    RAISE EXCEPTION 'Etapa 14 parada: o banco tem dados das partes que saem (%). Faça o backup e decida o que fazer com eles antes de migrar.',
      array_to_string(achados, ', ');
  END IF;
END $$;

-- Agenda: os bloqueios da primeira quadra passam para as tabelas novas.
CREATE TABLE "SerieBloqueio" (
    "id" UUID NOT NULL,
    "diaSemana" SMALLINT NOT NULL,
    "horaInicio" SMALLINT NOT NULL,
    "horaFim" SMALLINT NOT NULL,
    "motivo" VARCHAR(200) NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "criadaPorId" UUID NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradaEm" TIMESTAMPTZ(3),
    "encerradaPorId" UUID,

    CONSTRAINT "SerieBloqueio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bloqueio" (
    "id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "horaInicio" SMALLINT NOT NULL,
    "horaFim" SMALLINT NOT NULL,
    "motivo" VARCHAR(200) NOT NULL,
    "serieId" UUID,
    "criadoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladoEm" TIMESTAMPTZ(3),
    "canceladoPorId" UUID,
    "motivoCancelamento" VARCHAR(200),

    CONSTRAINT "Bloqueio_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SerieBloqueio" ("id", "diaSemana", "horaInicio", "horaFim", "motivo", "dataInicio",
  "dataFim", "criadaPorId", "criadaEm", "encerradaEm", "encerradaPorId")
SELECT "id", "diaSemana", "horaInicio", "horaFim", "motivo", "dataInicio", "dataFim",
  "criadaPorId", "criadaEm", "encerradaEm", "encerradaPorId"
FROM "SerieReserva" WHERE "tipo" = 'BLOQUEIO';

INSERT INTO "Bloqueio" ("id", "data", "horaInicio", "horaFim", "motivo", "serieId", "criadoPorId",
  "criadoEm", "canceladoEm", "canceladoPorId", "motivoCancelamento")
SELECT "id", "data", "horaInicio", "horaFim", "motivo", "serieId", "criadaPorId", "criadaEm",
  "canceladaEm", "canceladaPorId", "motivoCancelamento"
FROM "Reserva" WHERE "tipo" = 'BLOQUEIO';

CREATE INDEX "SerieBloqueio_encerradaEm_idx" ON "SerieBloqueio"("encerradaEm");
CREATE INDEX "Bloqueio_data_idx" ON "Bloqueio"("data");
CREATE INDEX "Bloqueio_serieId_idx" ON "Bloqueio"("serieId");

ALTER TABLE "SerieBloqueio" ADD CONSTRAINT "SerieBloqueio_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SerieBloqueio" ADD CONSTRAINT "SerieBloqueio_encerradaPorId_fkey" FOREIGN KEY ("encerradaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "SerieBloqueio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SerieBloqueio" ADD CONSTRAINT "SerieBloqueio_faixas" CHECK (
  "diaSemana" BETWEEN 0 AND 6
  AND "horaInicio" BETWEEN 5 AND 23
  AND "horaFim" BETWEEN 6 AND 24
  AND "horaFim" > "horaInicio"
  AND "dataFim" >= "dataInicio"
);
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_faixas" CHECK (
  "horaInicio" BETWEEN 5 AND 23
  AND "horaFim" BETWEEN 6 AND 24
  AND "horaFim" > "horaInicio"
);
-- FOCO-CA-06: dois bloqueios valendo nunca se sobrepõem na mesma data.
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_sem_sobreposicao" EXCLUDE USING gist (
  "data" WITH =,
  int4range("horaInicio", "horaFim") WITH &&
) WHERE ("canceladoEm" IS NULL);

-- Saem aluguel de quadra, faixas de preço, estoque e quadras parceiras.
DROP TABLE "PagamentoReserva";
DROP TABLE "Reserva";
DROP TABLE "SerieReserva";
DROP TABLE "FaixaPreco";
DROP TABLE "ItemVenda";
DROP TABLE "Venda";
DROP TABLE "Compra";
DROP TABLE "MovimentoEstoque";
DROP TABLE "Produto";
DROP TABLE "PagamentoQuadra";
DROP FUNCTION movimento_estoque_imutavel();
DROP TYPE "TipoReserva";
DROP TYPE "TipoMovimento";

ALTER TABLE "Turma" DROP CONSTRAINT "Turma_localId_fkey";
ALTER TABLE "Turma" DROP COLUMN "localId";
DROP TABLE "Local";
DROP TYPE "TipoLocal";

-- Saem os turnos de caixa.
ALTER TABLE "Lancamento" DROP CONSTRAINT "Lancamento_sessaoId_fkey";
DROP INDEX "Lancamento_sessaoId_idx";
ALTER TABLE "Lancamento" DROP COLUMN "sessaoId";
DROP TABLE "SessaoCaixa";
DROP FUNCTION sessao_caixa_fechada_imutavel();

-- O livro-razão fica só com mensalidades e estornos. ALTER TABLE não dispara o gatilho
-- de imutabilidade, que é de linha.
CREATE TYPE "CategoriaLancamento_new" AS ENUM ('MENSALIDADE', 'ESTORNO');
ALTER TABLE "Lancamento" ALTER COLUMN "categoria" TYPE "CategoriaLancamento_new" USING ("categoria"::text::"CategoriaLancamento_new");
ALTER TYPE "CategoriaLancamento" RENAME TO "CategoriaLancamento_old";
ALTER TYPE "CategoriaLancamento_new" RENAME TO "CategoriaLancamento";
DROP TYPE "CategoriaLancamento_old";

-- Uma quadra só.
DELETE FROM "Quadra" WHERE "ordem" <> 1;
UPDATE "Quadra" SET "nome" = 'Quadra' WHERE "nome" = 'Quadra 1';
ALTER TABLE "Quadra" DROP COLUMN "ordem";
CREATE UNIQUE INDEX "Quadra_uma_so" ON "Quadra" ((true));
