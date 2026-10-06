export const ROTULOS_ACOES = {
  LOGIN_SUCESSO: "Entrou no sistema",
  LOGIN_RECUSADO: "Login recusado",
  LOGIN_BLOQUEADO: "Login bloqueado",
  LOGOUT: "Saiu do sistema",
  ACESSO_NEGADO: "Acesso negado",
  USUARIO_CRIADO: "Usuário cadastrado",
  USUARIO_PERFIL_ALTERADO: "Perfil alterado",
  USUARIO_DESATIVADO: "Usuário desativado",
  SENHA_TROCADA: "Trocou a própria senha",
  SENHA_REDEFINIDA: "Senha temporária gerada",
  ADMIN_INICIAL_CRIADO: "Primeiro administrador criado",
} as const;

export const TAMANHO_PAGINA = 50;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// O Brasil não tem horário de verão desde 2019: São Paulo é sempre UTC-3.
const FUSO = "-03:00";

type Parametros = Record<string, string | string[] | undefined>;

function texto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" && valor !== "" ? valor : undefined;
}

/**
 * ACESSO-CA-20: converte os filtros da tela (datas no fuso de São Paulo, usuário,
 * ação, página) na consulta da API, descartando valores inválidos.
 */
export function filtroAuditoria(parametros: Parametros) {
  const inicio = texto(parametros.inicio);
  const fim = texto(parametros.fim);
  const usuarioId = texto(parametros.usuarioId);
  const acao = texto(parametros.acao);
  const pagina = Number(texto(parametros.pagina) ?? "1");

  const filtro = {
    inicio: inicio && DATA.test(inicio) ? inicio : undefined,
    fim: fim && DATA.test(fim) ? fim : undefined,
    usuarioId: usuarioId && UUID.test(usuarioId) ? usuarioId : undefined,
    acao: acao && acao in ROTULOS_ACOES ? acao : undefined,
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };

  const consulta = new URLSearchParams({
    pagina: String(filtro.pagina),
    tamanho: String(TAMANHO_PAGINA),
  });
  if (filtro.inicio) consulta.set("inicio", `${filtro.inicio}T00:00:00.000${FUSO}`);
  if (filtro.fim) consulta.set("fim", `${filtro.fim}T23:59:59.999${FUSO}`);
  if (filtro.usuarioId) consulta.set("usuarioId", filtro.usuarioId);
  if (filtro.acao) consulta.set("acao", filtro.acao);
  return { filtro, consulta };
}

/** Link de outra página mantendo os filtros atuais. */
export function linkPagina(
  filtro: ReturnType<typeof filtroAuditoria>["filtro"],
  pagina: number,
): string {
  const busca = new URLSearchParams();
  for (const chave of ["inicio", "fim", "usuarioId", "acao"] as const) {
    const valor = filtro[chave];
    if (valor) busca.set(chave, valor);
  }
  busca.set("pagina", String(pagina));
  return `/auditoria?${busca.toString()}`;
}

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "medium",
});

export function formatarDataHora(iso: string): string {
  return formatoDataHora.format(new Date(iso));
}
