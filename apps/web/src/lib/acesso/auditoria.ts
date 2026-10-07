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
  ALUNO_CRIADO: "Aluno cadastrado",
  ALUNO_ALTERADO: "Aluno alterado",
  ALUNO_INATIVADO: "Aluno inativado",
  ALUNO_REATIVADO: "Aluno reativado",
  ALUNO_EXPORTADO: "Dados de aluno exportados",
  ALUNO_ANONIMIZADO: "Aluno anonimizado",
  LOCAL_CRIADO: "Local cadastrado",
  LOCAL_ALTERADO: "Local alterado",
  TURMA_CRIADA: "Turma cadastrada",
  TURMA_ALTERADA: "Turma alterada",
  TURMA_ENCERRADA: "Turma encerrada",
  MATRICULA_CRIADA: "Matrícula feita",
  MATRICULA_ENCERRADA: "Matrícula encerrada",
  PRESENCA_REGISTRADA: "Presença registrada",
  PLANO_CRIADO: "Plano cadastrado",
  PLANO_ALTERADO: "Plano alterado",
  ASSINATURA_DEFINIDA: "Plano do aluno definido",
  ASSINATURA_ENCERRADA: "Plano do aluno encerrado",
  MENSALIDADES_GERADAS: "Mensalidades geradas",
  PAGAMENTO_REGISTRADO: "Pagamento registrado",
  PAGAMENTO_ESTORNADO: "Pagamento estornado",
  MENSALIDADE_CANCELADA: "Mensalidade cancelada",
  LOCAL_VALOR_HORA_ALTERADO: "Valor da hora alterado",
  PAGAMENTO_QUADRA_REGISTRADO: "Pagamento à quadra registrado",
  PAGAMENTO_QUADRA_ESTORNADO: "Pagamento à quadra estornado",
  CAIXA_ABERTO: "Caixa aberto",
  CAIXA_FECHADO: "Caixa fechado",
  LANCAMENTO_AVULSO_REGISTRADO: "Lançamento avulso registrado",
  LANCAMENTO_AVULSO_ESTORNADO: "Lançamento avulso estornado",
  PRODUTO_CRIADO: "Produto cadastrado",
  PRODUTO_ALTERADO: "Produto alterado",
  COMPRA_REGISTRADA: "Compra registrada",
  VENDA_REGISTRADA: "Venda registrada",
  ESTOQUE_AJUSTADO: "Estoque ajustado",
  VENDA_ESTORNADA: "Venda estornada",
  COMPRA_ESTORNADA: "Compra estornada",
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
