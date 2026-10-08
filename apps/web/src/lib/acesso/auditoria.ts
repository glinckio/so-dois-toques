import { formatarReais } from "@/lib/mensalidades/formatacao";

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
  FAIXAS_CRIADAS: "Faixas de preço criadas",
  FAIXA_REMOVIDA: "Faixa de preço removida",
  QUADRA_RENOMEADA: "Quadra renomeada",
  RESERVA_CRIADA: "Reserva criada",
  SERIE_CRIADA: "Reserva fixa criada",
  SERIE_ENCERRADA: "Reserva fixa encerrada",
  RESERVA_CANCELADA: "Reserva cancelada",
  RESERVA_PAGA: "Reserva paga",
  PAGAMENTO_RESERVA_ESTORNADO: "Pagamento de reserva estornado",
  CONTABIL_EXPORTADO: "Lançamentos exportados do Contábil",
  CLIENTES_ANONIMIZADOS: "Clientes de reservas antigas anonimizados",
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

export type AcaoAuditoria = keyof typeof ROTULOS_ACOES;
type TomDoEvento = "roxo" | "ouro" | "sucesso" | "perigo" | "neutro" | "areia";
type IconeDoEvento =
  | "entrada"
  | "saida"
  | "cadeado"
  | "bloqueio"
  | "chave"
  | "usuarios"
  | "aulas"
  | "local"
  | "check"
  | "recibo"
  | "dinheiro"
  | "caixa"
  | "estorno"
  | "estoque"
  | "carrinho"
  | "horarios"
  | "contabil"
  | "escudo"
  | "fechar";

/** O que foi feito, em poucas palavras, para agrupar e colorir a linha do tempo. */
const ASSUNTOS = [
  { prefixos: ["LOGIN_", "LOGOUT", "ACESSO_", "SENHA_", "USUARIO_", "ADMIN_"], assunto: "Acesso" },
  { prefixos: ["ALUNO_", "LOCAL_", "TURMA_", "MATRICULA_", "PRESENCA_"], assunto: "Aulas" },
  {
    prefixos: ["PLANO_", "ASSINATURA_", "MENSALIDADE", "PAGAMENTO_", "CAIXA_", "LANCAMENTO_"],
    assunto: "Dinheiro",
  },
  { prefixos: ["PRODUTO_", "COMPRA_", "VENDA_", "ESTOQUE_"], assunto: "Estoque" },
  { prefixos: ["FAIXA", "QUADRA_", "RESERVA_", "SERIE_"], assunto: "Horários" },
  { prefixos: ["CONTABIL_", "CLIENTES_"], assunto: "Dados" },
] as const;

export type AssuntoDoEvento = (typeof ASSUNTOS)[number]["assunto"];

const ICONE_DO_ASSUNTO: Record<AssuntoDoEvento, IconeDoEvento> = {
  Acesso: "escudo",
  Aulas: "aulas",
  Dinheiro: "dinheiro",
  Estoque: "estoque",
  Horários: "horarios",
  Dados: "contabil",
};

/**
 * VIVO-CA-14: ícone, tom e assunto de cada tipo de evento da auditoria. Alertas de
 * segurança ficam em vermelho, estornos e cancelamentos em areia, dinheiro em ouro.
 */
export function eventoDaAuditoria(acao: string): {
  assunto: AssuntoDoEvento;
  icone: IconeDoEvento;
  tom: TomDoEvento;
} {
  const assunto =
    ASSUNTOS.find((a) => a.prefixos.some((p) => acao.startsWith(p)))?.assunto ?? "Dados";
  if (acao === "LOGIN_SUCESSO") return { assunto, icone: "entrada", tom: "sucesso" };
  if (acao === "LOGOUT") return { assunto, icone: "saida", tom: "neutro" };
  if (acao === "LOGIN_RECUSADO" || acao === "LOGIN_BLOQUEADO")
    return { assunto, icone: "cadeado", tom: "perigo" };
  if (acao === "ACESSO_NEGADO" || acao === "USUARIO_DESATIVADO")
    return { assunto, icone: "bloqueio", tom: "perigo" };
  if (acao.startsWith("SENHA_")) return { assunto, icone: "chave", tom: "roxo" };
  if (acao.startsWith("USUARIO_") || acao === "ADMIN_INICIAL_CRIADO")
    return { assunto, icone: "usuarios", tom: "roxo" };
  if (/ESTORNAD|CANCELAD/.test(acao)) return { assunto, icone: "estorno", tom: "areia" };
  if (/ENCERRAD|INATIVADO|REMOVIDA|ANONIMIZAD/.test(acao))
    return { assunto, icone: "fechar", tom: "neutro" };
  if (acao === "PRESENCA_REGISTRADA") return { assunto, icone: "check", tom: "roxo" };
  if (acao.startsWith("LOCAL_")) return { assunto, icone: "local", tom: "roxo" };
  if (acao.startsWith("CAIXA_")) return { assunto, icone: "caixa", tom: "ouro" };
  if (acao.startsWith("MENSALIDADE")) return { assunto, icone: "recibo", tom: "ouro" };
  if (acao.startsWith("VENDA_") || acao.startsWith("COMPRA_"))
    return { assunto, icone: "carrinho", tom: "ouro" };
  return {
    assunto,
    icone: ICONE_DO_ASSUNTO[assunto],
    tom: assunto === "Dinheiro" ? "ouro" : "roxo",
  };
}

const NOME_DO_DIA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const SO_A_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});
const DIA_EM_SP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/** "14:05" no horário de Brasília. */
export function horaDoRegistro(iso: string): string {
  return SO_A_HORA.format(new Date(iso));
}

/**
 * VIVO-CA-14: separa os registros (já em ordem, do mais novo ao mais antigo) por dia
 * no fuso de São Paulo, com "Hoje" e "Ontem" no lugar da data quando couber.
 */
export function agruparPorDia<T extends { criadaEm: string }>(
  registros: readonly T[],
  agora: Date,
) {
  const hoje = DIA_EM_SP.format(agora);
  const ontem = DIA_EM_SP.format(new Date(agora.getTime() - 24 * 60 * 60 * 1000));
  const grupos: { dia: string; rotulo: string; itens: T[] }[] = [];
  for (const registro of registros) {
    const quando = new Date(registro.criadaEm);
    const dia = DIA_EM_SP.format(quando);
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === dia) {
      ultimo.itens.push(registro);
      continue;
    }
    const rotulo = dia === hoje ? "Hoje" : dia === ontem ? "Ontem" : NOME_DO_DIA.format(quando);
    grupos.push({
      dia,
      rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1),
      itens: [registro],
    });
  }
  return grupos;
}

const NOMES_DOS_CAMPOS: Record<string, string> = {
  email: "E-mail",
  area: "Área",
  metodo: "Método",
  automatica: "Automática",
  competencia: "Competência",
  series: "Séries",
  numeroRecibo: "Recibo nº",
  diaSemana: "Dia da semana",
  horaInicio: "Início",
  horaFim: "Fim",
  valorHoraCentavos: "Valor da hora",
  matriculasEncerradas: "Matrículas encerradas",
  diferencaCentavos: "Diferença",
  lancamentoId: "Lançamento",
  estornoLancamentoId: "Estorno",
};

function nomeDoCampo(chave: string): string {
  if (NOMES_DOS_CAMPOS[chave]) return NOMES_DOS_CAMPOS[chave];
  const palavras = chave
    .replace(/(Centavos|Id)$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return palavras.charAt(0).toUpperCase() + palavras.slice(1);
}

function valorDoCampo(chave: string, valor: unknown): string {
  if (typeof valor === "number" && /Centavos$|^valor(Anterior|Novo)$/.test(chave)) {
    return formatarReais(valor);
  }
  if (typeof valor === "boolean") return valor ? "sim" : "não";
  if (typeof valor === "string") return UUID.test(valor) ? `${valor.slice(0, 8)}…` : valor;
  if (typeof valor === "number") return String(valor);
  if (Array.isArray(valor)) {
    return valor.every((v) => typeof v === "string" || typeof v === "number")
      ? valor.map((v) => valorDoCampo("", v)).join(", ")
      : `${valor.length} itens`;
  }
  if (valor === null || valor === undefined) return "—";
  return JSON.stringify(valor);
}

/**
 * VIVO-CA-14: os detalhes do registro como pares "campo: valor" legíveis (centavos em
 * reais, códigos encurtados, listas por vírgula). O JSON completo continua na tela.
 */
export function detalhesLegiveis(detalhes: unknown): { campo: string; valor: string }[] {
  if (detalhes === null || typeof detalhes !== "object" || Array.isArray(detalhes)) return [];
  return Object.entries(detalhes as Record<string, unknown>)
    .filter(([, valor]) => valor !== undefined)
    .map(([chave, valor]) => ({ campo: nomeDoCampo(chave), valor: valorDoCampo(chave, valor) }));
}

/** Atalhos de período (tudo, hoje, 7 e 30 dias), mantendo usuário e ação. */
export function periodosRapidos(filtro: ReturnType<typeof filtroAuditoria>["filtro"], agora: Date) {
  const hoje = DIA_EM_SP.format(agora);
  const voltar = (dias: number) => {
    const d = new Date(`${hoje}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - dias);
    return d.toISOString().slice(0, 10);
  };
  const atalhos = [
    { rotulo: "Tudo", inicio: undefined },
    { rotulo: "Hoje", inicio: hoje },
    { rotulo: "7 dias", inicio: voltar(6) },
    { rotulo: "30 dias", inicio: voltar(29) },
  ];
  return atalhos.map(({ rotulo, inicio }) => {
    const busca = new URLSearchParams();
    if (inicio) {
      busca.set("inicio", inicio);
      busca.set("fim", hoje);
    }
    if (filtro.usuarioId) busca.set("usuarioId", filtro.usuarioId);
    if (filtro.acao) busca.set("acao", filtro.acao);
    const consulta = busca.toString();
    return {
      rotulo,
      href: consulta ? `/auditoria?${consulta}` : "/auditoria",
      atual: inicio
        ? filtro.inicio === inicio && filtro.fim === hoje
        : !filtro.inicio && !filtro.fim,
    };
  });
}
