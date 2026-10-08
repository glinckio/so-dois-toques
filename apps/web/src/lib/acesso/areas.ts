/** Áreas do sistema e o caminho de cada uma no menu. A regra de quem acessa o quê fica na API. */
export const AREAS = [
  "inicio",
  "aulas",
  "horarios",
  "estoque",
  "caixa",
  "contabil",
  "usuarios",
  "auditoria",
] as const;
export type Area = (typeof AREAS)[number];

export const MENU: Record<Area, { rotulo: string; href: string }> = {
  inicio: { rotulo: "Início", href: "/" },
  aulas: { rotulo: "Aulas", href: "/aulas" },
  horarios: { rotulo: "Horários", href: "/horarios" },
  estoque: { rotulo: "Estoque", href: "/estoque" },
  caixa: { rotulo: "Caixa", href: "/caixa" },
  contabil: { rotulo: "Contábil", href: "/contabil" },
  usuarios: { rotulo: "Usuários", href: "/usuarios" },
  auditoria: { rotulo: "Auditoria", href: "/auditoria" },
};

/** ACESSO-CA-11: o menu mostra só as áreas que a API liberou para o perfil, na ordem fixa. */
export function itensDoMenu(areasPermitidas: readonly string[]) {
  return AREAS.filter((area) => areasPermitidas.includes(area)).map((area) => ({
    area,
    ...MENU[area],
  }));
}

export const PERFIS = {
  ADMINISTRADOR: "Administrador",
  PROFESSOR: "Professor",
  ATENDENTE: "Atendente",
} as const;
export type Perfil = keyof typeof PERFIS;

/**
 * VIS-CA-02: qual link do menu corresponde à página aberta. Vale o caminho mais
 * longo que contém a página ("/aulas/alunos/1" marca "/aulas/alunos", não "/aulas");
 * o Início ("/") só fica marcado nele mesmo.
 */
export function linkAtivo(caminho: string, hrefs: readonly string[]): string | undefined {
  return hrefs
    .filter((href) =>
      href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`),
    )
    .sort((a, b) => b.length - a.length)[0];
}

/** VIVO-CA-02: grupos do menu lateral. */
export const GRUPOS_DO_MENU: { rotulo: string; areas: readonly Area[] }[] = [
  { rotulo: "Visão geral", areas: ["inicio"] },
  { rotulo: "Operação", areas: ["aulas", "horarios", "estoque", "caixa"] },
  { rotulo: "Gestão", areas: ["contabil", "usuarios", "auditoria"] },
];

/** Ordem das áreas na barra do celular: o que a equipe usa mais na quadra vem primeiro. */
const PRIORIDADE_NO_CELULAR: readonly Area[] = [
  "inicio",
  "aulas",
  "horarios",
  "caixa",
  "estoque",
  "contabil",
  "usuarios",
  "auditoria",
];

/**
 * VIVO-CA-02: no celular cabem até cinco itens na barra. Com mais áreas, ficam
 * quatro e o resto vai para "Mais" (na ordem do menu).
 */
export function separarMenuDoCelular<T extends { area: Area }>(
  itens: readonly T[],
): { barra: T[]; mais: T[] } {
  if (itens.length <= 5) return { barra: [...itens], mais: [] };
  const ordenados = [...itens].sort(
    (a, b) => PRIORIDADE_NO_CELULAR.indexOf(a.area) - PRIORIDADE_NO_CELULAR.indexOf(b.area),
  );
  const barra = ordenados.slice(0, 4);
  return { barra, mais: itens.filter((i) => !barra.includes(i)) };
}
