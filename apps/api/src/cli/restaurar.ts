import { z } from "zod";
import { descreverConferencia } from "../backup/regras.js";
import { restaurarBackup, RestauracaoRecusada } from "./backup-banco.js";

/**
 * pnpm db:restaurar <arquivo> <banco> — restaura um backup num banco novo do
 * mesmo servidor de DATABASE_URL e mostra a conferência (LANC-CA-05 e 06).
 * Compare com a conferência que o pnpm db:backup mostrou.
 */
const [arquivo, destino] = process.argv.slice(2);
const url = z.string().url().safeParse(process.env["DATABASE_URL"]);
if (!arquivo || !destino || !url.success) {
  console.error("Uso: pnpm db:restaurar <arquivo.dump> <banco_novo>  (com DATABASE_URL definida)");
  process.exit(1);
}

try {
  const conferencia = await restaurarBackup({ databaseUrl: url.data, arquivo, destino });
  console.log(`Backup restaurado no banco "${destino}".\n\nConferência do banco restaurado:`);
  console.log(descreverConferencia(conferencia));
} catch (erro) {
  const mensagem = (erro as Error).message.replace(/:\/\/[^@\s]*@/g, "://***@");
  console.error(erro instanceof RestauracaoRecusada ? mensagem : `Restauração falhou: ${mensagem}`);
  process.exit(1);
}
