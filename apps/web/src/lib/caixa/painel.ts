import { hojeEmSaoPaulo, horaEmSaoPaulo } from "@/lib/aulas/formatacao";
import { centavosDe, FORMAS, formatarReais, type Forma } from "@/lib/mensalidades/formatacao";
import { CATEGORIAS_AVULSAS, ehAvulso, nomeDaCategoria } from "./formatacao";

type LinhaResumo = { entradas: number; saidas: number; saldo: number };

/** "2026-10-06" vira "06/10". */
function diaEMes(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/**
 * VIVO-CA-08: desde quando o caixa está aberto. No mesmo dia, só a hora ("07:43");
 * aberto em outro dia (esquecido aberto), a data e a hora ("06/10 às 18:02").
 */
export function desdeQuando(
  abertaEm: string,
  agora: Date = new Date(),
): {
  texto: string;
  outroDia: boolean;
} {
  const dia = hojeEmSaoPaulo(new Date(abertaEm));
  const hora = horaEmSaoPaulo(abertaEm);
  const outroDia = dia !== hojeEmSaoPaulo(agora);
  return { texto: outroDia ? `${diaEMes(dia)} às ${hora}` : hora, outroDia };
}

export type SituacaoDaDiferenca = "vazio" | "invalido" | "bate" | "sobra" | "falta";

/**
 * CAIXA-CA-04: diferença entre o dinheiro contado e o esperado, calculada enquanto se
 * digita (contado − esperado, como a API). Quem decide se o fechamento vale é a API.
 */
export function diferencaDoFechamento(
  digitado: string,
  esperadoCentavos: number,
): { situacao: SituacaoDaDiferenca; centavos: number; titulo: string; detalhe: string } {
  if (!digitado.trim()) {
    return {
      situacao: "vazio",
      centavos: 0,
      titulo: "Conte a gaveta",
      detalhe: `O esperado é ${formatarReais(esperadoCentavos)}.`,
    };
  }
  const contado = centavosDe(digitado);
  if (contado === null) {
    return {
      situacao: "invalido",
      centavos: 0,
      titulo: "Valor inválido",
      detalhe: "Use o formato 150,00.",
    };
  }
  const diferenca = contado - esperadoCentavos;
  if (diferenca === 0) {
    return {
      situacao: "bate",
      centavos: 0,
      titulo: "Bateu",
      detalhe: "O dinheiro contado confere com o esperado.",
    };
  }
  const detalhe = "Não bateu: escreva o motivo na observação.";
  return diferenca > 0
    ? {
        situacao: "sobra",
        centavos: diferenca,
        titulo: `Sobram ${formatarReais(diferenca)}`,
        detalhe,
      }
    : {
        situacao: "falta",
        centavos: diferenca,
        titulo: `Faltam ${formatarReais(-diferenca)}`,
        detalhe,
      };
}

/** CAIXA-CA-05: o resultado do fechamento de um turno, em poucas palavras. */
export function resultadoDoTurno(diferencaCentavos: number | null): {
  situacao: "aberto" | "bateu" | "sobrou" | "faltou";
  texto: string;
} {
  if (diferencaCentavos === null) return { situacao: "aberto", texto: "Em andamento" };
  if (diferencaCentavos === 0) return { situacao: "bateu", texto: "Bateu" };
  return diferencaCentavos > 0
    ? { situacao: "sobrou", texto: `Sobrou ${formatarReais(diferencaCentavos)}` }
    : { situacao: "faltou", texto: `Faltou ${formatarReais(-diferencaCentavos)}` };
}

/**
 * CAIXA-CA-05: a linha de resumo da lista de turnos ("3 turnos · 1 com diferença no
 * fechamento"). Turno ainda aberto não conta como fechamento que bateu.
 */
export function resumoDosTurnos(diferencas: readonly (number | null)[]): string {
  if (diferencas.length === 0) return "Cada abertura do caixa, do troco ao fechamento.";
  const total = `${diferencas.length} ${diferencas.length === 1 ? "turno" : "turnos"}`;
  const fechados = diferencas.filter((d) => d !== null);
  const comDiferenca = fechados.filter((d) => d !== 0).length;
  if (fechados.length === 0) return `${total} · nenhum fechado ainda`;
  if (comDiferenca > 0) return `${total} · ${comDiferenca} com diferença no fechamento`;
  return fechados.length === 1
    ? `${total} · o fechamento bateu`
    : `${total} · todos os ${fechados.length} fechamentos bateram`;
}

export type LinhaDaForma = LinhaResumo & {
  forma: Forma;
  rotulo: string;
  /** Parte das entradas do dia (ou do turno) que veio por esta forma, de 0 a 1. */
  fracao: number;
};

/** MENS-CA-17: cada forma de pagamento, na ordem de sempre, com a parte dela nas entradas. */
export function formasDePagamento(porForma: Record<Forma, LinhaResumo>): LinhaDaForma[] {
  const formas = Object.keys(FORMAS) as Forma[];
  const total = formas.reduce((t, f) => t + Math.max(0, porForma[f]?.entradas ?? 0), 0);
  return formas.map((forma) => {
    const linha = porForma[forma] ?? { entradas: 0, saidas: 0, saldo: 0 };
    return {
      forma,
      rotulo: FORMAS[forma],
      entradas: linha.entradas,
      saidas: linha.saidas,
      saldo: linha.saldo,
      fracao: total > 0 ? Math.max(0, linha.entradas) / total : 0,
    };
  });
}

/** Percentual inteiro de uma fração ("37"), para rótulos de barra. */
export function percentual(fracao: number): number {
  return Math.round(Math.min(1, Math.max(0, fracao)) * 100);
}

export type LinhaDaCategoria = {
  categoria: string;
  nome: string;
  entradas: number;
  saidas: number;
  /** Movimento da categoria (entradas + saídas) em relação à maior, de 0 a 1. */
  fracao: number;
};

/** CAIXA-CA-05: categorias do turno, da que mais movimentou para a que menos. */
export function categoriasDoTurno(
  porCategoria: readonly { categoria: string; entradas: number; saidas: number }[],
): LinhaDaCategoria[] {
  const maior = Math.max(0, ...porCategoria.map((c) => c.entradas + c.saidas));
  return [...porCategoria]
    .sort((a, b) => b.entradas + b.saidas - (a.entradas + a.saidas))
    .map((c) => ({
      ...c,
      nome: nomeDaCategoria(c.categoria),
      fracao: maior > 0 ? (c.entradas + c.saidas) / maior : 0,
    }));
}

/**
 * CAIXA-CA-02: prévia do lançamento avulso enquanto se preenche: se o valor entra
 * ou sai do caixa e o aviso quando suprimento ou sangria não está em dinheiro.
 */
export function previaDoAvulso(
  categoria: string,
  valorDigitado: string,
  forma: string,
): {
  tipo: "ENTRADA" | "SAIDA";
  valorCentavos: number | null;
  texto: string;
  alerta: string | null;
} | null {
  if (!ehAvulso(categoria)) return null;
  const regra = CATEGORIAS_AVULSAS[categoria];
  const entrada = regra.tipo === "ENTRADA";
  // "em dinheiro", "em cartão de débito", mas "em Pix" (nome próprio).
  const nomeForma = Object.hasOwn(FORMAS, forma)
    ? forma === "PIX"
      ? FORMAS.PIX
      : FORMAS[forma as Forma].toLowerCase()
    : null;
  const texto = `${entrada ? "Entra no caixa" : "Sai do caixa"}${nomeForma ? ` em ${nomeForma}` : ""}`;
  return {
    tipo: regra.tipo,
    valorCentavos: centavosDe(valorDigitado),
    texto,
    alerta:
      regra.soDinheiro && forma !== "DINHEIRO"
        ? `${nomeDaCategoria(categoria)} só pode ser em dinheiro.`
        : null,
  };
}
