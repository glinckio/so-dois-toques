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
