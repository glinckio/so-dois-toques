-- CreateEnum
CREATE TYPE "SituacaoMensalidade" AS ENUM ('ABERTA', 'PAGA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "CategoriaLancamento" AS ENUM ('MENSALIDADE', 'ESTORNO');

-- CreateTable
CREATE TABLE "Plano" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "aulasPorSemana" SMALLINT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" UUID NOT NULL,
    "alunoId" UUID NOT NULL,
    "planoId" UUID NOT NULL,
    "diaVencimento" SMALLINT NOT NULL,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "motivoDesconto" VARCHAR(200),
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "criadaPorId" UUID NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensalidade" (
    "id" UUID NOT NULL,
    "alunoId" UUID NOT NULL,
    "assinaturaId" UUID NOT NULL,
    "competencia" DATE NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "vencimento" DATE NOT NULL,
    "situacao" "SituacaoMensalidade" NOT NULL DEFAULT 'ABERTA',
    "canceladaEm" TIMESTAMPTZ(3),
    "canceladaPorId" UUID,
    "motivoCancelamento" VARCHAR(200),
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" UUID NOT NULL,
    "numeroRecibo" SERIAL NOT NULL,
    "mensalidadeId" UUID NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "data" DATE NOT NULL,
    "recebidoPorId" UUID NOT NULL,
    "recebidoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lancamentoId" UUID NOT NULL,
    "estornadoEm" TIMESTAMPTZ(3),
    "estornadoPorId" UUID,
    "motivoEstorno" VARCHAR(200),
    "estornoLancamentoId" UUID,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" UUID NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "data" DATE NOT NULL,
    "categoria" "CategoriaLancamento" NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "origemTipo" VARCHAR(40),
    "origemId" VARCHAR(64),
    "estornoDeId" UUID,
    "criadoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plano_nome_key" ON "Plano"("nome");

-- CreateIndex
CREATE INDEX "Assinatura_alunoId_fim_idx" ON "Assinatura"("alunoId", "fim");

-- CreateIndex
CREATE INDEX "Mensalidade_competencia_situacao_idx" ON "Mensalidade"("competencia", "situacao");

-- CreateIndex
CREATE INDEX "Mensalidade_situacao_vencimento_idx" ON "Mensalidade"("situacao", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "Mensalidade_alunoId_competencia_key" ON "Mensalidade"("alunoId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_numeroRecibo_key" ON "Pagamento"("numeroRecibo");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_lancamentoId_key" ON "Pagamento"("lancamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_estornoLancamentoId_key" ON "Pagamento"("estornoLancamentoId");

-- CreateIndex
CREATE INDEX "Pagamento_mensalidadeId_idx" ON "Pagamento"("mensalidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Lancamento_estornoDeId_key" ON "Lancamento"("estornoDeId");

-- CreateIndex
CREATE INDEX "Lancamento_data_idx" ON "Lancamento"("data");

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensalidade" ADD CONSTRAINT "Mensalidade_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensalidade" ADD CONSTRAINT "Mensalidade_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "Assinatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensalidade" ADD CONSTRAINT "Mensalidade_canceladaPorId_fkey" FOREIGN KEY ("canceladaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_mensalidadeId_fkey" FOREIGN KEY ("mensalidadeId") REFERENCES "Mensalidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_recebidoPorId_fkey" FOREIGN KEY ("recebidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_estornadoPorId_fkey" FOREIGN KEY ("estornadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_estornoLancamentoId_fkey" FOREIGN KEY ("estornoLancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_estornoDeId_fkey" FOREIGN KEY ("estornoDeId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restrições de negócio garantidas no próprio banco (Etapa 3)
ALTER TABLE "Plano" ADD CONSTRAINT "Plano_faixas" CHECK (
  "aulasPorSemana" BETWEEN 1 AND 7 AND "valorCentavos" BETWEEN 100 AND 1000000
);
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_faixas" CHECK (
  "diaVencimento" BETWEEN 1 AND 28
  AND "descontoCentavos" >= 0
  AND EXTRACT(DAY FROM "inicio") = 1
  AND ("fim" IS NULL OR (EXTRACT(DAY FROM "fim") = 1 AND "fim" >= "inicio"))
);
-- Um aluno tem no máximo uma assinatura vigente.
CREATE UNIQUE INDEX "Assinatura_vigente_unica" ON "Assinatura" ("alunoId") WHERE "fim" IS NULL;
ALTER TABLE "Mensalidade" ADD CONSTRAINT "Mensalidade_faixas" CHECK (
  "valorCentavos" > 0 AND EXTRACT(DAY FROM "competencia") = 1
);
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_valor_positivo" CHECK ("valorCentavos" > 0);
-- Uma mensalidade tem no máximo um pagamento que não foi estornado.
CREATE UNIQUE INDEX "Pagamento_valido_unico" ON "Pagamento" ("mensalidadeId") WHERE "estornadoEm" IS NULL;

-- Livro-razão do Caixa (MENS-CA-16): valor sempre positivo, e nenhuma linha pode ser alterada ou apagada.
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_valor_positivo" CHECK ("valorCentavos" > 0);
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_estorno_nao_e_ele_mesmo" CHECK ("estornoDeId" IS NULL OR "estornoDeId" <> "id");

CREATE FUNCTION "lancamento_imutavel"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Lançamentos do caixa não podem ser alterados nem apagados; use um estorno'
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Lancamento_sem_update_delete"
  BEFORE UPDATE OR DELETE ON "Lancamento"
  FOR EACH ROW EXECUTE FUNCTION "lancamento_imutavel"();

CREATE TRIGGER "Lancamento_sem_truncate"
  BEFORE TRUNCATE ON "Lancamento"
  FOR EACH STATEMENT EXECUTE FUNCTION "lancamento_imutavel"();
