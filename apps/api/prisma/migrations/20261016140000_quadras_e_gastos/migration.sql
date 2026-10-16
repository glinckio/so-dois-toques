-- Etapa 17: quadras alugadas (várias), turma e bloqueio numa quadra, contrato mensal de
-- quadra, gastos no livro-razão e o saldo inicial do caixa.

-- Novas categorias do livro-razão. O tipo é recriado (em vez de ADD VALUE) para que os
-- valores novos possam ser usados nesta mesma migração. ALTER TABLE não dispara o gatilho
-- de imutabilidade, que é de linha.
CREATE TYPE "CategoriaLancamento_new" AS ENUM ('MENSALIDADE', 'ESTORNO', 'SALDO_INICIAL', 'ALUGUEL_MENSAL', 'LOCACAO_AVULSA', 'EQUIPAMENTO', 'INVESTIMENTO', 'OUTRO_GASTO');
ALTER TABLE "Lancamento" ALTER COLUMN "categoria" TYPE "CategoriaLancamento_new" USING ("categoria"::text::"CategoriaLancamento_new");
ALTER TYPE "CategoriaLancamento" RENAME TO "CategoriaLancamento_old";
ALTER TYPE "CategoriaLancamento_new" RENAME TO "CategoriaLancamento";
DROP TYPE "CategoriaLancamento_old";

-- Várias quadras: sai o limite de uma só.
DROP INDEX "Quadra_uma_so";
ALTER TABLE "Quadra" ADD COLUMN "ativa" BOOLEAN NOT NULL DEFAULT true;

-- Turmas, bloqueios e séries ficam na quadra que já existe.
ALTER TABLE "Turma" ADD COLUMN "quadraId" UUID;
ALTER TABLE "SerieBloqueio" ADD COLUMN "quadraId" UUID;
ALTER TABLE "Bloqueio" ADD COLUMN "quadraId" UUID;
UPDATE "Turma" SET "quadraId" = (SELECT id FROM "Quadra" ORDER BY "criadaEm" LIMIT 1);
UPDATE "SerieBloqueio" SET "quadraId" = (SELECT id FROM "Quadra" ORDER BY "criadaEm" LIMIT 1);
UPDATE "Bloqueio" SET "quadraId" = (SELECT id FROM "Quadra" ORDER BY "criadaEm" LIMIT 1);
ALTER TABLE "Turma" ALTER COLUMN "quadraId" SET NOT NULL;
ALTER TABLE "SerieBloqueio" ALTER COLUMN "quadraId" SET NOT NULL;
ALTER TABLE "Bloqueio" ALTER COLUMN "quadraId" SET NOT NULL;

DROP INDEX "Turma_diaSemana_ativa_idx";
CREATE INDEX "Turma_quadraId_diaSemana_ativa_idx" ON "Turma"("quadraId", "diaSemana", "ativa");
DROP INDEX "Bloqueio_data_idx";
CREATE INDEX "Bloqueio_quadraId_data_idx" ON "Bloqueio"("quadraId", "data");

ALTER TABLE "Turma" ADD CONSTRAINT "Turma_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "Quadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SerieBloqueio" ADD CONSTRAINT "SerieBloqueio_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "Quadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "Quadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- GASTO-CA-02: dois bloqueios valendo não se sobrepõem na mesma quadra e data.
ALTER TABLE "Bloqueio" DROP CONSTRAINT "Bloqueio_sem_sobreposicao";
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_sem_sobreposicao" EXCLUDE USING gist (
  "quadraId" WITH =,
  "data" WITH =,
  int4range("horaInicio", "horaFim") WITH &&
) WHERE ("canceladoEm" IS NULL);

-- GASTO-CA-03: contrato mensal de quadra.
CREATE TABLE "ContratoQuadra" (
    "id" UUID NOT NULL,
    "quadraId" UUID NOT NULL,
    "diaSemana" SMALLINT NOT NULL,
    "horaInicio" SMALLINT NOT NULL,
    "horaFim" SMALLINT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "diaPagamento" SMALLINT NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "criadoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoPorId" UUID,
    "encerradoEm" TIMESTAMPTZ(3),

    CONSTRAINT "ContratoQuadra_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContratoQuadra_fim_idx" ON "ContratoQuadra"("fim");
ALTER TABLE "ContratoQuadra" ADD CONSTRAINT "ContratoQuadra_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "Quadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContratoQuadra" ADD CONSTRAINT "ContratoQuadra_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContratoQuadra" ADD CONSTRAINT "ContratoQuadra_encerradoPorId_fkey" FOREIGN KEY ("encerradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContratoQuadra" ADD CONSTRAINT "ContratoQuadra_faixas" CHECK (
  "diaSemana" BETWEEN 0 AND 6
  AND "horaInicio" >= 300 AND "horaFim" <= 1439 AND "horaFim" > "horaInicio"
  AND "valorCentavos" BETWEEN 100 AND 2000000
  AND "diaPagamento" BETWEEN 1 AND 28
  AND ("fim" IS NULL OR "fim" > "inicio")
);

-- GASTO-CA-04: um lançamento por contrato e mês (origemId = "<contrato>:<AAAA-MM>").
CREATE UNIQUE INDEX "Lancamento_aluguel_mensal_unico" ON "Lancamento" ("origemId")
  WHERE "categoria" = 'ALUGUEL_MENSAL';
-- GASTO-CA-07: um só saldo inicial.
CREATE UNIQUE INDEX "Lancamento_saldo_inicial_unico" ON "Lancamento" ("categoria")
  WHERE "categoria" = 'SALDO_INICIAL';

-- GASTO-CA-07: R$ 600,00 em caixa em 16/10/2026, em nome do primeiro administrador.
INSERT INTO "Lancamento" ("id", "tipo", "valorCentavos", "forma", "data", "categoria",
  "descricao", "criadoPorId")
SELECT gen_random_uuid(), 'ENTRADA', 60000, 'DINHEIRO', DATE '2026-10-16', 'SALDO_INICIAL',
  'Saldo que sobrou até 16/10/2026', u.id
FROM "Usuario" u
WHERE u."perfil" = 'ADMINISTRADOR'
ORDER BY u."criadoEm"
LIMIT 1;
