-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('COMPRA', 'VENDA', 'AJUSTE', 'ESTORNO_VENDA', 'ESTORNO_COMPRA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CategoriaLancamento" ADD VALUE 'VENDA';
ALTER TYPE "CategoriaLancamento" ADD VALUE 'COMPRA_ESTOQUE';

-- CreateTable
CREATE TABLE "Produto" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "precoCentavos" INTEGER NOT NULL,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "saldo" INTEGER NOT NULL DEFAULT 0,
    "custoMedioCentavos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" UUID NOT NULL,
    "totalCentavos" INTEGER NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "feitaPorId" UUID NOT NULL,
    "feitaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lancamentoId" UUID NOT NULL,
    "estornadaEm" TIMESTAMPTZ(3),
    "estornadaPorId" UUID,
    "motivoEstorno" VARCHAR(200),
    "estornoLancamentoId" UUID,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" UUID NOT NULL,
    "vendaId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoCentavos" INTEGER NOT NULL,
    "custoCentavos" INTEGER NOT NULL,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "totalCentavos" INTEGER NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "data" DATE NOT NULL,
    "feitaPorId" UUID NOT NULL,
    "feitaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lancamentoId" UUID NOT NULL,
    "estornadaEm" TIMESTAMPTZ(3),
    "estornadaPorId" UUID,
    "motivoEstorno" VARCHAR(200),
    "estornoLancamentoId" UUID,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoEstoque" (
    "id" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "saldoDepois" INTEGER NOT NULL,
    "motivo" VARCHAR(200),
    "origemId" UUID,
    "criadoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produto_nome_key" ON "Produto"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_lancamentoId_key" ON "Venda"("lancamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_estornoLancamentoId_key" ON "Venda"("estornoLancamentoId");

-- CreateIndex
CREATE INDEX "Venda_feitaEm_idx" ON "Venda"("feitaEm");

-- CreateIndex
CREATE INDEX "ItemVenda_vendaId_idx" ON "ItemVenda"("vendaId");

-- CreateIndex
CREATE INDEX "ItemVenda_produtoId_idx" ON "ItemVenda"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Compra_lancamentoId_key" ON "Compra"("lancamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Compra_estornoLancamentoId_key" ON "Compra"("estornoLancamentoId");

-- CreateIndex
CREATE INDEX "Compra_produtoId_idx" ON "Compra"("produtoId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_produtoId_criadoEm_idx" ON "MovimentoEstoque"("produtoId", "criadoEm");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_feitaPorId_fkey" FOREIGN KEY ("feitaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_estornadaPorId_fkey" FOREIGN KEY ("estornadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_estornoLancamentoId_fkey" FOREIGN KEY ("estornoLancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_feitaPorId_fkey" FOREIGN KEY ("feitaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_estornadaPorId_fkey" FOREIGN KEY ("estornadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_estornoLancamentoId_fkey" FOREIGN KEY ("estornoLancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras que o banco também garante (Etapa 6).
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_faixas" CHECK (
  "precoCentavos" BETWEEN 1 AND 100000
  AND "estoqueMinimo" BETWEEN 0 AND 10000
  AND "saldo" >= 0
  AND "custoMedioCentavos" >= 0
);
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_total_positivo" CHECK ("totalCentavos" > 0);
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_faixas" CHECK (
  "quantidade" > 0 AND "precoCentavos" > 0 AND "custoCentavos" >= 0
);
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_faixas" CHECK ("quantidade" > 0 AND "totalCentavos" > 0);
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_faixas" CHECK (
  "quantidade" <> 0 AND "saldoDepois" >= 0
);

-- O histórico do estoque não é alterado nem apagado.
CREATE FUNCTION movimento_estoque_imutavel() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Movimentos de estoque não podem ser alterados nem apagados';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "MovimentoEstoque_sem_update_delete"
BEFORE UPDATE OR DELETE ON "MovimentoEstoque"
FOR EACH ROW EXECUTE FUNCTION movimento_estoque_imutavel();

CREATE TRIGGER "MovimentoEstoque_sem_truncate"
BEFORE TRUNCATE ON "MovimentoEstoque"
FOR EACH STATEMENT EXECUTE FUNCTION movimento_estoque_imutavel();
