/** Regras puras do backup e da restauração (LANC-CA-04 a 06). */

export type Conferencia = {
  usuarios: number;
  alunos: number;
  lancamentos: number;
  entradasCentavos: number;
  saidasCentavos: number;
  auditoria: number;
};

export const ROTULOS_CONFERENCIA: Record<keyof Conferencia, string> = {
  usuarios: "Usuários",
  alunos: "Alunos",
  lancamentos: "Lançamentos",
  entradasCentavos: "Entradas (centavos)",
  saidasCentavos: "Saídas (centavos)",
  auditoria: "Registros de auditoria",
};

const NOME_DE_BANCO = /^[a-z][a-z0-9_]{0,62}$/;

export function nomeDeBancoValido(nome: string): boolean {
  return NOME_DE_BANCO.test(nome);
}

/** Nome do arquivo no horário de São Paulo: so_dois_toques-AAAA-MM-DD-HHMM.dump. */
export function nomeDoArquivo(agora: Date): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  return `so_dois_toques-${partes.year}-${partes.month}-${partes.day}-${partes.hour}${partes.minute}.dump`;
}

/**
 * Tira a senha da URL do banco, para ela ir só na variável PGPASSWORD e nunca
 * nos argumentos do pg_dump (visíveis na lista de processos) nem na saída.
 * Também tira o parâmetro "schema", que é do Prisma e o libpq não entende.
 */
export function separarSenha(databaseUrl: string): { url: string; senha?: string } {
  const url = new URL(databaseUrl);
  const senha = url.password ? decodeURIComponent(url.password) : undefined;
  url.password = "";
  url.searchParams.delete("schema");
  return { url: url.toString(), senha };
}

export function nomeDoBanco(databaseUrl: string): string {
  return decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ""));
}

/** A mesma conexão, apontando para outro banco do mesmo servidor. */
export function urlDoBanco(databaseUrl: string, nome: string): string {
  if (!nomeDeBancoValido(nome)) throw new Error(`Nome de banco inválido: ${nome}`);
  const url = new URL(databaseUrl);
  url.pathname = `/${nome}`;
  return url.toString();
}

/** Campos em que duas conferências diferem (vazio quando batem). */
export function diferencas(a: Conferencia, b: Conferencia): (keyof Conferencia)[] {
  return (Object.keys(ROTULOS_CONFERENCIA) as (keyof Conferencia)[]).filter((k) => a[k] !== b[k]);
}

export function descreverConferencia(c: Conferencia): string {
  return (Object.keys(ROTULOS_CONFERENCIA) as (keyof Conferencia)[])
    .map((k) => `  ${ROTULOS_CONFERENCIA[k]}: ${c[k]}`)
    .join("\n");
}
