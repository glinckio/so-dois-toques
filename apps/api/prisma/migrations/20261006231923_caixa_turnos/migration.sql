-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CategoriaLancamento" ADD VALUE 'SUPRIMENTO';
ALTER TYPE "CategoriaLancamento" ADD VALUE 'SANGRIA';
ALTER TYPE "CategoriaLancamento" ADD VALUE 'DESPESA';
ALTER TYPE "CategoriaLancamento" ADD VALUE 'RECEITA_AVULSA';

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "sessaoId" UUID;

-- CreateTable
CREATE TABLE "SessaoCaixa" (
    "id" UUID NOT NULL,
    "trocoInicialCentavos" INTEGER NOT NULL,
    "abertaPorId" UUID NOT NULL,
    "abertaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadaPorId" UUID,
    "fechadaEm" TIMESTAMPTZ(3),
    "esperadoDinheiroCentavos" INTEGER,
    "contadoDinheiroCentavos" INTEGER,
    "diferencaCentavos" INTEGER,
    "observacao" VARCHAR(300),

    CONSTRAINT "SessaoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessaoCaixa_abertaEm_idx" ON "SessaoCaixa"("abertaEm");

-- CreateIndex
CREATE INDEX "Lancamento_sessaoId_idx" ON "Lancamento"("sessaoId");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "SessaoCaixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoCaixa" ADD CONSTRAINT "SessaoCaixa_abertaPorId_fkey" FOREIGN KEY ("abertaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoCaixa" ADD CONSTRAINT "SessaoCaixa_fechadaPorId_fkey" FOREIGN KEY ("fechadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras que o banco também garante (Etapa 5).
CREATE UNIQUE INDEX "SessaoCaixa_uma_aberta" ON "SessaoCaixa" ((1)) WHERE "fechadaEm" IS NULL;
ALTER TABLE "SessaoCaixa" ADD CONSTRAINT "SessaoCaixa_faixas" CHECK (
  "trocoInicialCentavos" BETWEEN 0 AND 1000000
  AND ("contadoDinheiroCentavos" IS NULL OR "contadoDinheiroCentavos" >= 0)
  AND (
    ("fechadaEm" IS NULL AND "fechadaPorId" IS NULL AND "contadoDinheiroCentavos" IS NULL)
    OR ("fechadaEm" IS NOT NULL AND "fechadaPorId" IS NOT NULL AND "contadoDinheiroCentavos" IS NOT NULL
        AND "esperadoDinheiroCentavos" IS NOT NULL AND "diferencaCentavos" IS NOT NULL)
  )
);

-- Turno fechado não muda mais, e nenhum turno é apagado.
CREATE FUNCTION sessao_caixa_fechada_imutavel() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Turno de caixa não pode ser apagado';
  END IF;
  IF OLD."fechadaEm" IS NOT NULL THEN
    RAISE EXCEPTION 'Turno de caixa fechado não pode ser alterado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SessaoCaixa_fechada_imutavel"
BEFORE UPDATE OR DELETE ON "SessaoCaixa"
FOR EACH ROW EXECUTE FUNCTION sessao_caixa_fechada_imutavel();
