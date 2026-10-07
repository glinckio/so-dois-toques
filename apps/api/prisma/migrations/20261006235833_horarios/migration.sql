-- CreateEnum
CREATE TYPE "TipoReserva" AS ENUM ('RESERVA', 'BLOQUEIO');

-- AlterEnum
ALTER TYPE "CategoriaLancamento" ADD VALUE 'ALUGUEL_QUADRA';

-- CreateTable
CREATE TABLE "Quadra" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(40) NOT NULL,
    "ordem" SMALLINT NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quadra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaixaPreco" (
    "id" UUID NOT NULL,
    "diaSemana" SMALLINT NOT NULL,
    "horaInicio" SMALLINT NOT NULL,
    "horaFim" SMALLINT NOT NULL,
    "valorHoraCentavos" INTEGER NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaixaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerieReserva" (
    "id" UUID NOT NULL,
    "tipo" "TipoReserva" NOT NULL,
    "quadraId" UUID NOT NULL,
    "diaSemana" SMALLINT NOT NULL,
    "horaInicio" SMALLINT NOT NULL,
    "horaFim" SMALLINT NOT NULL,
    "clienteNome" VARCHAR(80),
    "clienteTelefone" VARCHAR(11),
    "motivo" VARCHAR(200),
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "criadaPorId" UUID NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradaEm" TIMESTAMPTZ(3),
    "encerradaPorId" UUID,

    CONSTRAINT "SerieReserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" UUID NOT NULL,
    "tipo" "TipoReserva" NOT NULL,
    "quadraId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "horaInicio" SMALLINT NOT NULL,
    "horaFim" SMALLINT NOT NULL,
    "clienteNome" VARCHAR(80),
    "clienteTelefone" VARCHAR(11),
    "motivo" VARCHAR(200),
    "valorCentavos" INTEGER NOT NULL,
    "serieId" UUID,
    "criadaPorId" UUID NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladaEm" TIMESTAMPTZ(3),
    "canceladaPorId" UUID,
    "motivoCancelamento" VARCHAR(200),

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoReserva" (
    "id" UUID NOT NULL,
    "reservaId" UUID NOT NULL,
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

    CONSTRAINT "PagamentoReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quadra_nome_key" ON "Quadra"("nome");

-- CreateIndex
CREATE INDEX "FaixaPreco_diaSemana_idx" ON "FaixaPreco"("diaSemana");

-- CreateIndex
CREATE INDEX "SerieReserva_encerradaEm_idx" ON "SerieReserva"("encerradaEm");

-- CreateIndex
CREATE INDEX "Reserva_data_quadraId_idx" ON "Reserva"("data", "quadraId");

-- CreateIndex
CREATE INDEX "Reserva_serieId_idx" ON "Reserva"("serieId");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoReserva_lancamentoId_key" ON "PagamentoReserva"("lancamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoReserva_estornoLancamentoId_key" ON "PagamentoReserva"("estornoLancamentoId");

-- CreateIndex
CREATE INDEX "PagamentoReserva_reservaId_idx" ON "PagamentoReserva"("reservaId");

-- AddForeignKey
ALTER TABLE "SerieReserva" ADD CONSTRAINT "SerieReserva_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "Quadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerieReserva" ADD CONSTRAINT "SerieReserva_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerieReserva" ADD CONSTRAINT "SerieReserva_encerradaPorId_fkey" FOREIGN KEY ("encerradaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "Quadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "SerieReserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_canceladaPorId_fkey" FOREIGN KEY ("canceladaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoReserva" ADD CONSTRAINT "PagamentoReserva_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoReserva" ADD CONSTRAINT "PagamentoReserva_recebidoPorId_fkey" FOREIGN KEY ("recebidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoReserva" ADD CONSTRAINT "PagamentoReserva_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoReserva" ADD CONSTRAINT "PagamentoReserva_estornadoPorId_fkey" FOREIGN KEY ("estornadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoReserva" ADD CONSTRAINT "PagamentoReserva_estornoLancamentoId_fkey" FOREIGN KEY ("estornoLancamentoId") REFERENCES "Lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras que o banco também garante (Etapa 7).
CREATE EXTENSION IF NOT EXISTS btree_gist;

INSERT INTO "Quadra" ("id", "nome", "ordem") VALUES
  (gen_random_uuid(), 'Quadra 1', 1),
  (gen_random_uuid(), 'Quadra 2', 2);

ALTER TABLE "FaixaPreco" ADD CONSTRAINT "FaixaPreco_faixas" CHECK (
  "diaSemana" BETWEEN 0 AND 6
  AND "horaInicio" BETWEEN 0 AND 23
  AND "horaFim" BETWEEN 1 AND 24
  AND "horaFim" > "horaInicio"
  AND "valorHoraCentavos" BETWEEN 100 AND 200000
);
ALTER TABLE "FaixaPreco" ADD CONSTRAINT "FaixaPreco_sem_sobreposicao" EXCLUDE USING gist (
  "diaSemana" WITH =,
  int4range("horaInicio", "horaFim") WITH &&
);

ALTER TABLE "SerieReserva" ADD CONSTRAINT "SerieReserva_faixas" CHECK (
  "diaSemana" BETWEEN 0 AND 6
  AND "horaInicio" BETWEEN 0 AND 23
  AND "horaFim" BETWEEN 1 AND 24
  AND "horaFim" > "horaInicio"
  AND "dataFim" >= "dataInicio"
  AND (("tipo" = 'RESERVA' AND "clienteNome" IS NOT NULL)
    OR ("tipo" = 'BLOQUEIO' AND "clienteNome" IS NULL AND "motivo" IS NOT NULL))
);

ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_faixas" CHECK (
  "horaInicio" BETWEEN 0 AND 23
  AND "horaFim" BETWEEN 1 AND 24
  AND "horaFim" > "horaInicio"
  AND (("tipo" = 'RESERVA' AND "clienteNome" IS NOT NULL AND "valorCentavos" > 0)
    OR ("tipo" = 'BLOQUEIO' AND "clienteNome" IS NULL AND "motivo" IS NOT NULL AND "valorCentavos" = 0))
);
-- HOR-CA-04: duas ocupações ativas nunca se sobrepõem na mesma quadra e data.
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_sem_sobreposicao" EXCLUDE USING gist (
  "quadraId" WITH =,
  "data" WITH =,
  int4range("horaInicio", "horaFim") WITH &&
) WHERE ("canceladaEm" IS NULL);

ALTER TABLE "PagamentoReserva" ADD CONSTRAINT "PagamentoReserva_valor_positivo" CHECK ("valorCentavos" > 0);
-- Uma reserva tem no máximo um pagamento valendo.
CREATE UNIQUE INDEX "PagamentoReserva_um_valendo" ON "PagamentoReserva" ("reservaId") WHERE "estornadoEm" IS NULL;
