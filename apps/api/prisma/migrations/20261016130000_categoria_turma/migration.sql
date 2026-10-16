-- Etapa 16 (TURMA-CA-08): a turma é masculina, mista ou feminina; as que já existiam ficam mistas.
CREATE TYPE "CategoriaTurma" AS ENUM ('MASCULINO', 'MISTO', 'FEMININO');
ALTER TABLE "Turma" ADD COLUMN "categoria" "CategoriaTurma" NOT NULL DEFAULT 'MISTO';
