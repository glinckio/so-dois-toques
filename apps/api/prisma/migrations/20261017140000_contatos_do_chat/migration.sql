-- Etapa 20 (CHAT-CA-14): contatos adicionados na hora pela janela de nova conversa do Chat.
-- CreateTable
CREATE TABLE "ContatoChat" (
    "numero" VARCHAR(20) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "criadoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ContatoChat_pkey" PRIMARY KEY ("numero")
);

-- AddForeignKey
ALTER TABLE "ContatoChat" ADD CONSTRAINT "ContatoChat_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
