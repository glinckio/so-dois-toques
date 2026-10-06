-- CreateEnum
CREATE TYPE "TipoLocal" AS ENUM ('PARCEIRA', 'PROPRIA');

-- CreateEnum
CREATE TYPE "Nivel" AS ENUM ('INICIANTE', 'INTERMEDIARIO', 'AVANCADO');

-- CreateEnum
CREATE TYPE "Consentidor" AS ENUM ('ALUNO', 'RESPONSAVEL');

-- CreateTable
CREATE TABLE "Aluno" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "nomeBusca" VARCHAR(120) NOT NULL,
    "telefone" VARCHAR(11) NOT NULL,
    "nascimento" DATE,
    "email" VARCHAR(254),
    "observacoes" VARCHAR(500),
    "emergenciaNome" VARCHAR(120),
    "emergenciaTelefone" VARCHAR(11),
    "responsavelNome" VARCHAR(120),
    "responsavelTelefone" VARCHAR(11),
    "consentimentoEm" TIMESTAMPTZ(3) NOT NULL,
    "consentimentoPor" "Consentidor" NOT NULL,
    "consentimentoRegistradoPorId" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "anonimizadoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Local" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "tipo" "TipoLocal" NOT NULL,
    "endereco" VARCHAR(200),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "nivel" "Nivel" NOT NULL,
    "localId" UUID NOT NULL,
    "professorId" UUID NOT NULL,
    "vagas" INTEGER NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "inicio" DATE NOT NULL,
    "encerradaEm" TIMESTAMPTZ(3),
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioTurma" (
    "id" UUID NOT NULL,
    "turmaId" UUID NOT NULL,
    "diaSemana" SMALLINT NOT NULL,
    "inicio" SMALLINT NOT NULL,
    "fim" SMALLINT NOT NULL,

    CONSTRAINT "HorarioTurma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" UUID NOT NULL,
    "alunoId" UUID NOT NULL,
    "turmaId" UUID NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presenca" (
    "id" UUID NOT NULL,
    "turmaId" UUID NOT NULL,
    "alunoId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "registradaPorId" UUID NOT NULL,
    "registradaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presenca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aluno_nomeBusca_idx" ON "Aluno"("nomeBusca");

-- CreateIndex
CREATE INDEX "Aluno_telefone_idx" ON "Aluno"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Local_nome_key" ON "Local"("nome");

-- CreateIndex
CREATE INDEX "Turma_professorId_ativa_idx" ON "Turma"("professorId", "ativa");

-- CreateIndex
CREATE INDEX "HorarioTurma_turmaId_idx" ON "HorarioTurma"("turmaId");

-- CreateIndex
CREATE INDEX "Matricula_turmaId_fim_idx" ON "Matricula"("turmaId", "fim");

-- CreateIndex
CREATE INDEX "Matricula_alunoId_fim_idx" ON "Matricula"("alunoId", "fim");

-- CreateIndex
CREATE INDEX "Presenca_alunoId_idx" ON "Presenca"("alunoId");

-- CreateIndex
CREATE UNIQUE INDEX "Presenca_turmaId_alunoId_data_key" ON "Presenca"("turmaId", "alunoId", "data");

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_consentimentoRegistradoPorId_fkey" FOREIGN KEY ("consentimentoRegistradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioTurma" ADD CONSTRAINT "HorarioTurma_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restrições de negócio garantidas no próprio banco (Etapa 2)
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_vagas_faixa" CHECK ("vagas" BETWEEN 1 AND 40);
ALTER TABLE "HorarioTurma" ADD CONSTRAINT "HorarioTurma_faixa" CHECK (
  "diaSemana" BETWEEN 0 AND 6 AND "inicio" >= 300 AND "fim" <= 1439 AND "fim" > "inicio"
);
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_fim_depois_do_inicio" CHECK ("fim" IS NULL OR "fim" >= "inicio");
-- Um aluno só pode ter uma matrícula aberta em cada turma.
CREATE UNIQUE INDEX "Matricula_aberta_unica" ON "Matricula" ("alunoId", "turmaId") WHERE "fim" IS NULL;
