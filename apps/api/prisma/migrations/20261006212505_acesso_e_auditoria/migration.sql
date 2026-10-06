-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'PROFESSOR', 'ATENDENTE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "senhaHash" TEXT NOT NULL,
    "trocarSenha" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessao" (
    "id" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "usuarioId" UUID NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUsoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMPTZ(3) NOT NULL,
    "ip" VARCHAR(64),
    "agente" VARCHAR(300),

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativaLogin" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "ip" VARCHAR(64),
    "sucesso" BOOLEAN NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" BIGSERIAL NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atorId" UUID,
    "acao" VARCHAR(40) NOT NULL,
    "alvoTipo" VARCHAR(40),
    "alvoId" VARCHAR(64),
    "ip" VARCHAR(64),
    "detalhes" JSONB,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_perfil_ativo_idx" ON "Usuario"("perfil", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Sessao_tokenHash_key" ON "Sessao"("tokenHash");

-- CreateIndex
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

-- CreateIndex
CREATE INDEX "TentativaLogin_email_criadaEm_idx" ON "TentativaLogin"("email", "criadaEm");

-- CreateIndex
CREATE INDEX "TentativaLogin_ip_criadaEm_idx" ON "TentativaLogin"("ip", "criadaEm");

-- CreateIndex
CREATE INDEX "Auditoria_criadaEm_idx" ON "Auditoria"("criadaEm");

-- CreateIndex
CREATE INDEX "Auditoria_atorId_criadaEm_idx" ON "Auditoria"("atorId", "criadaEm");

-- CreateIndex
CREATE INDEX "Auditoria_acao_criadaEm_idx" ON "Auditoria"("acao", "criadaEm");

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- E-mail sempre guardado em minúsculas, sem espaços nas pontas.
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_email_normalizado" CHECK ("email" = lower(btrim("email")));

-- Auditoria imutável (ACESSO-CA-19): nenhuma linha pode ser alterada ou apagada.
CREATE FUNCTION "auditoria_imutavel"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Registros de auditoria não podem ser alterados nem apagados'
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Auditoria_sem_update_delete"
  BEFORE UPDATE OR DELETE ON "Auditoria"
  FOR EACH ROW EXECUTE FUNCTION "auditoria_imutavel"();

CREATE TRIGGER "Auditoria_sem_truncate"
  BEFORE TRUNCATE ON "Auditoria"
  FOR EACH STATEMENT EXECUTE FUNCTION "auditoria_imutavel"();
