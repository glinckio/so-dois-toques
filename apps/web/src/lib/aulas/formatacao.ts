export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export const NIVEIS = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
} as const;
export type Nivel = keyof typeof NIVEIS;

export const TIPOS_LOCAL = { PARCEIRA: "Quadra parceira", PROPRIA: "Quadra própria" } as const;
export type TipoLocal = keyof typeof TIPOS_LOCAL;

export type Horario = { diaSemana: number; inicio: number; fim: number };

/** "21998765432" → "(21) 99876-5432". */
export function formatarTelefone(digitos: string | null | undefined): string {
  if (!digitos) return "";
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digitos);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos;
}

export function horaDe(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

/** "HH:MM" → minutos desde 00:00; null se inválido. */
export function minutosDe(hora: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export type GrupoDeHorario = { dias: string; faixa: string; diasSemana: number[] };

/** Dias com o mesmo horário juntos ("Seg e Qua" + "07:00–08:00"), um grupo por pílula. */
export function gruposDeHorarios(horarios: readonly Horario[]): GrupoDeHorario[] {
  const grupos = new Map<string, number[]>();
  for (const h of [...horarios].sort((a, b) => a.diaSemana - b.diaSemana || a.inicio - b.inicio)) {
    const chave = `${horaDe(h.inicio)}–${horaDe(h.fim)}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), h.diaSemana]);
  }
  return [...grupos.entries()].map(([faixa, dias]) => {
    const nomes = dias.map((d) => DIAS_CURTOS[d]);
    const lista =
      nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}` : nomes[0]!;
    return { dias: lista, faixa, diasSemana: dias };
  });
}

/** "Seg e Qua, 07:00–08:00 · Sex, 18:00–19:00": agrupa dias com o mesmo horário. */
export function descreverHorarios(horarios: readonly Horario[]): string {
  return gruposDeHorarios(horarios)
    .map((g) => `${g.dias}, ${g.faixa}`)
    .join(" · ");
}

/** "2026-10-06" → "06/10/2026". */
export function formatarData(data: string | null | undefined): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function hojeEmSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

const HORA_EM_SP = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Hora de um instante em São Paulo: "14:02". */
export function horaEmSaoPaulo(instante: string | Date): string {
  return HORA_EM_SP.format(new Date(instante));
}

/** Dia da semana de uma data "AAAA-MM-DD" (0 = domingo). */
export function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

/** A última data (até hoje) em que a turma teve aula; serve de padrão na tela de presença. */
export function ultimaAula(horarios: readonly Horario[], hoje: string): string | null {
  const dias = new Set(horarios.map((h) => h.diaSemana));
  if (dias.size === 0) return null;
  const base = new Date(`${hoje}T12:00:00Z`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() - i * 24 * 60 * 60 * 1000);
    if (dias.has(d.getUTCDay())) return d.toISOString().slice(0, 10);
  }
  return null;
}
