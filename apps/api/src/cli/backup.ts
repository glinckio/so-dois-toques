import { z } from "zod";
import { descreverConferencia } from "../backup/regras.js";
import { fazerBackup } from "./backup-banco.js";

/**
 * pnpm db:backup — cópia completa do banco de DATABASE_URL (LANC-CA-04).
 * Precisa do pg_dump (cliente PostgreSQL) da mesma versão do servidor ou mais nova.
 * A pasta pode mudar com BACKUP_PASTA (padrão: backups/).
 */
const ambiente = z.object({
  DATABASE_URL: z.string().url(),
  BACKUP_PASTA: z.string().min(1).default("backups"),
});

const lido = ambiente.safeParse(process.env);
if (!lido.success) {
  console.error(
    `Variáveis inválidas: ${[...new Set(lido.error.issues.map((i) => i.path.join(".")))].join(", ")}`,
  );
  process.exit(1);
}

try {
  const { arquivo, conferencia } = await fazerBackup({
    databaseUrl: lido.data.DATABASE_URL,
    pasta: lido.data.BACKUP_PASTA,
  });
  console.log(`Backup gravado em ${arquivo}\n\nConferência do banco copiado:`);
  console.log(descreverConferencia(conferencia));
} catch (erro) {
  console.error(`Backup falhou: ${(erro as Error).message.replace(/:\/\/[^@\s]*@/g, "://***@")}`);
  process.exit(1);
}
