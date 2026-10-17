-- Etapa 19: feedback dos alunos (formulário público, respostas e limite de envios).
-- CreateTable
CREATE TABLE "RespostaFeedback" (
    "id" UUID NOT NULL,
    "nota" SMALLINT NOT NULL,
    "comentario" VARCHAR(1000),
    "melhoria" VARCHAR(1000),
    "turmaId" UUID,
    "nome" VARCHAR(120),
    "lidaEm" TIMESTAMPTZ(3),
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespostaFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioFeedback" (
    "id" BIGSERIAL NOT NULL,
    "ipHash" CHAR(64) NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvioFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularioFeedback" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pausado" BOOLEAN NOT NULL DEFAULT false,
    "alteradoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormularioFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RespostaFeedback_criadaEm_idx" ON "RespostaFeedback"("criadaEm");

-- CreateIndex
CREATE INDEX "RespostaFeedback_lidaEm_idx" ON "RespostaFeedback"("lidaEm");

-- CreateIndex
CREATE INDEX "EnvioFeedback_ipHash_criadoEm_idx" ON "EnvioFeedback"("ipHash", "criadoEm");

-- AddForeignKey
ALTER TABLE "RespostaFeedback" ADD CONSTRAINT "RespostaFeedback_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FEED-CA-01: nota de 1 a 5, também no banco.
ALTER TABLE "RespostaFeedback" ADD CONSTRAINT "RespostaFeedback_nota_check" CHECK ("nota" BETWEEN 1 AND 5);

-- Uma linha só: o formulário começa aberto.
ALTER TABLE "FormularioFeedback" ADD CONSTRAINT "FormularioFeedback_uma_linha" CHECK ("id" = 1);
INSERT INTO "FormularioFeedback" ("id", "pausado") VALUES (1, false);
