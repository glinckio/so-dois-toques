-- Etapa 20 (CHAT-CA-09): quem da equipe enviou cada mensagem do chat do WhatsApp.
-- CreateTable
CREATE TABLE "MensagemEnviada" (
    "id" VARCHAR(64) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "usuarioId" UUID NOT NULL,
    "enviadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemEnviada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MensagemEnviada_numero_enviadaEm_idx" ON "MensagemEnviada"("numero", "enviadaEm");

-- AddForeignKey
ALTER TABLE "MensagemEnviada" ADD CONSTRAINT "MensagemEnviada_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
