/** Regras puras do módulo de Aulas (Etapa 2). Sem acesso a banco. */

export const NIVEIS = ["INICIANTE", "INTERMEDIARIO", "AVANCADO"] as const;
export type Nivel = (typeof NIVEIS)[number];

export const TIPOS_LOCAL = ["PARCEIRA", "PROPRIA"] as const;
export type TipoLocal = (typeof TIPOS_LOCAL)[number];

export const VAGAS_MINIMO = 1;
export const VAGAS_MAXIMO = 40;
/** Horários em minutos desde 00:00: das 05:00 às 23:59. */
export const HORARIO_MINIMO = 5 * 60;
export const HORARIO_MAXIMO = 23 * 60 + 59;
export const MAIORIDADE = 18;

const FUSO = "America/Sao_Paulo";
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** AULAS-CA-04: só dígitos, com DDD (10 ou 11 dígitos). Devolve null se inválido. */
export function normalizarTelefone(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length !== 10 && digitos.length !== 11) return null;
  if (digitos.startsWith("0") || digitos[2] === "0") return null;
  return digitos;
}

/** AULAS-CA-05: texto para busca sem acento e sem diferença de maiúsculas. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Valida uma data de calendário "AAAA-MM-DD" (que existe de fato). */
export function dataValida(data: string): boolean {
  const partes = DATA.exec(data);
  if (!partes) return false;
  const [, ano, mes, dia] = partes.map(Number) as [number, number, number, number];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/** Data de hoje no calendário de São Paulo, como "AAAA-MM-DD". */
export function hojeEmSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

/** Converte "AAAA-MM-DD" no Date (meia-noite UTC) que o Prisma grava numa coluna DATE. */
export function paraDataDoBanco(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}

export function deDataDoBanco(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Idade completa em anos numa data (ambas "AAAA-MM-DD"). */
export function idadeEm(nascimento: string, data: string): number {
  const [an, mn, dn] = nascimento.split("-").map(Number) as [number, number, number];
  const [ad, md, dd] = data.split("-").map(Number) as [number, number, number];
  let idade = ad - an;
  if (md < mn || (md === mn && dd < dn)) idade -= 1;
  return idade;
}

/** AULAS-CA-03: menor de 18 anos na data do cadastro precisa de responsável. */
export function exigeResponsavel(nascimento: string, hoje: string): boolean {
  return idadeEm(nascimento, hoje) < MAIORIDADE;
}

export type Horario = { diaSemana: number; inicio: number; fim: number };

export function horarioValido(h: Horario): boolean {
  return (
    Number.isInteger(h.diaSemana) &&
    h.diaSemana >= 0 &&
    h.diaSemana <= 6 &&
    Number.isInteger(h.inicio) &&
    Number.isInteger(h.fim) &&
    h.inicio >= HORARIO_MINIMO &&
    h.fim <= HORARIO_MAXIMO &&
    h.fim > h.inicio
  );
}

export function horariosSobrepostos(a: Horario, b: Horario): boolean {
  return a.diaSemana === b.diaSemana && a.inicio < b.fim && b.inicio < a.fim;
}

/** Algum horário da própria lista se sobrepõe a outro? */
export function temSobreposicaoInterna(horarios: readonly Horario[]): boolean {
  return horarios.some((a, i) => horarios.slice(i + 1).some((b) => horariosSobrepostos(a, b)));
}

/** AULAS-CA-12: horários novos que batem com horários de outras turmas do mesmo professor. */
export function conflitosDeHorario<T extends Horario>(
  novos: readonly Horario[],
  existentes: readonly T[],
): T[] {
  return existentes.filter((e) => novos.some((n) => horariosSobrepostos(n, e)));
}

/** "HH:MM" para minutos desde 00:00; null se inválido. */
export function minutosDe(hora: string): number | null {
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!partes) return null;
  return Number(partes[1]) * 60 + Number(partes[2]);
}

export function horaDe(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

export function diaDaSemana(data: string): number {
  return paraDataDoBanco(data).getUTCDay();
}

export type ProblemaDataPresenca = "DATA_INVALIDA" | "FUTURA" | "ANTES_DA_TURMA" | "SEM_AULA";

export const MENSAGENS_PRESENCA: Record<ProblemaDataPresenca, string> = {
  DATA_INVALIDA: "Data inválida.",
  FUTURA: "Não dá para registrar presença em data futura.",
  ANTES_DA_TURMA: "A turma ainda não existia nessa data.",
  SEM_AULA: "A turma não tem aula nesse dia da semana.",
};

/** AULAS-CA-18: a data precisa ser de aula da turma, entre a criação da turma e hoje. */
export function validarDataDePresenca(
  data: string,
  horarios: readonly Horario[],
  criadaEm: string,
  hoje: string,
): ProblemaDataPresenca | null {
  if (!dataValida(data)) return "DATA_INVALIDA";
  if (data > hoje) return "FUTURA";
  if (data < criadaEm) return "ANTES_DA_TURMA";
  const dia = diaDaSemana(data);
  if (!horarios.some((h) => h.diaSemana === dia)) return "SEM_AULA";
  return null;
}

/** A matrícula vale na data quando começou até ela e não terminou até ela. */
export function matriculaValeEm(
  matricula: { inicio: string; fim: string | null },
  data: string,
): boolean {
  return matricula.inicio <= data && (matricula.fim === null || matricula.fim > data);
}

export const NOME_ANONIMIZADO = "Aluno anonimizado";

/** AULAS-CA-08: o que fica no lugar dos dados pessoais depois da anonimização. */
export function dadosAnonimizados() {
  return {
    nome: NOME_ANONIMIZADO,
    nomeBusca: "",
    telefone: "",
    nascimento: null,
    email: null,
    observacoes: null,
    emergenciaNome: null,
    emergenciaTelefone: null,
    responsavelNome: null,
    responsavelTelefone: null,
    ativo: false,
  } as const;
}
