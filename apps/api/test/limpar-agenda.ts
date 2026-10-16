import pg from "pg";

/**
 * Duas turmas ativas não dividem horário na mesma quadra (GASTO-CA-02). Os arquivos de
 * teste usam o mesmo banco, então cada um começa com a agenda livre: turmas ativas são
 * encerradas e bloqueios valendo, cancelados.
 */
const cliente = new pg.Client({ connectionString: process.env["DATABASE_URL"] });
await cliente.connect();
try {
  await cliente.query(
    `UPDATE "Turma" SET ativa = false, "encerradaEm" = now() - interval '1 day' WHERE ativa`,
  );
  await cliente.query(
    `UPDATE "Bloqueio" SET "canceladoEm" = now(), "motivoCancelamento" = 'Teste' WHERE "canceladoEm" IS NULL`,
  );
} finally {
  await cliente.end();
}
