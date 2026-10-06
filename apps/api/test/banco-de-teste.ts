/**
 * Banco exclusivo dos testes de integração: o nome do banco de desenvolvimento
 * com o sufixo "_test". Ele é recriado do zero a cada execução, porque a
 * auditoria é imutável (ACESSO-CA-19) e não pode ser limpa tabela a tabela.
 */
export function urlBancoDeTeste(urlDesenvolvimento: string): string {
  const url = new URL(urlDesenvolvimento);
  const nome = url.pathname.replace(/^\//, "");
  if (!/^[a-z0-9_]+$/.test(nome)) throw new Error("Nome de banco inesperado em DATABASE_URL");
  url.pathname = `/${nome.endsWith("_test") ? nome : `${nome}_test`}`;
  return url.toString();
}
