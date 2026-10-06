-- AlterEnum
ALTER TYPE "CategoriaLancamento" ADD VALUE 'QUADRA_PARCEIRA';

-- AlterTable
ALTER TABLE "Local" ADD COLUMN     "valorHoraCentavos" INTEGER;

-- CreateTable
CREATE TABLE "PagamentoQuadra" (
    "id" UUID NOT NULL,
    "localId" UUID NOT NULL,
    "competencia" DATE NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "data" DATE NOT NULL,
    "pagoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lancamentoId" UUID NOT NULL,
    "estornadoEm" TIMESTAMPTZ(3),
    "estornadoPorId" UUID,
    "motivoEstorno" VARCHAR(200),
    "estornoLancamentoId" UUID,

    CONSTRAINT "PagamentoQuadra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoQuadra_lancamentoId_key" ON "PagamentoQuadra"("lancamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoQuadra_estornoLancamentoId_key" ON "PagamentoQuadra"("estornoLancamentoId");

-- CreateIndex
CREATE INDEX "PagamentoQuadra_localId_competencia_idx" ON "PagamentoQuadra"("localId", "competencia");

-- CreateIndex
CREATE INDEX "PagamentoQuadra_competencia_idx" ON "PagamentoQuadra"("competencia");

-- AddForeignKey
ALTER TABLE "PagamentoQuadra" ADD CONSTRAINT "PagamentoQuadra_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoQuadra" ADD CONSTRAINT "PagamentoQuadra_pagoPorId_fkey" FOREIGN KEY ("pagoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoQuadra" ADD CONSTRAINT "PagamentoQuadra_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoQuadra" ADD CONSTRAINT "PagamentoQuadra_estornadoPorId_fkey" FOREIGN KEY ("estornadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoQuadra" ADD CONSTRAINT "PagamentoQuadra_estornoLancamentoId_fkey" FOREIGN KEY ("estornoLancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras que o banco também garante (Etapa 4).
ALTER TABLE "Local" ADD CONSTRAINT "Local_valor_hora" CHECK (
  "valorHoraCentavos" IS NULL OR ("tipo" = 'PARCEIRA' AND "valorHoraCentavos" BETWEEN 100 AND 200000)
);
ALTER TABLE "PagamentoQuadra" ADD CONSTRAINT "PagamentoQuadra_faixas" CHECK (
  "valorCentavos" > 0 AND EXTRACT(DAY FROM "competencia") = 1
);
