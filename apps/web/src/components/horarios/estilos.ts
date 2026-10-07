import type { SituacaoDoHorario } from "@/lib/horarios/agenda";

/**
 * Cor de cada situação na grade. Tudo escrito por inteiro para o Tailwind gerar as
 * classes (a CSP não deixa estilo embutido). O fundo é opaco, para as linhas das
 * horas não aparecerem por baixo do bloco.
 */
export const FUNDO_DA_SITUACAO: Record<SituacaoDoHorario, string> = {
  pago: "border-sucesso/45 bg-cartao bg-linear-to-br from-sucesso/25 to-sucesso/5",
  "a-pagar": "border-ouro/50 bg-cartao bg-linear-to-br from-ouro/25 to-ouro/5",
  fixa: "border-roxo/55 bg-cartao bg-linear-to-br from-roxo-forte/50 to-roxo/10 shadow-[0_14px_30px_-18px_rgb(124_58_237_/_0.95)]",
  bloqueio:
    "border-apagado/35 bg-elevado bg-[repeating-linear-gradient(135deg,rgb(157_150_187_/_0.16)_0_6px,transparent_6px_12px)]",
};

/** Filete de cor à esquerda do bloco. */
export const FILETE_DA_SITUACAO: Record<SituacaoDoHorario, string> = {
  pago: "bg-sucesso",
  "a-pagar": "bg-ouro",
  fixa: "bg-roxo",
  bloqueio: "bg-apagado/70",
};

/** Amostra da legenda: o mesmo desenho do bloco, em miniatura. */
export const AMOSTRA_DA_SITUACAO: Record<SituacaoDoHorario | "livre", string> = {
  ...FUNDO_DA_SITUACAO,
  livre: "border-dashed border-apagado/60",
};
