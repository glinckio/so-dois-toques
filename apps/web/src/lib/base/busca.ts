import { AREAS, MENU, type Area } from "@/lib/acesso/areas";

export type ItemDaBusca = {
  rotulo: string;
  href: string;
  grupo: "Áreas" | "Ações rápidas" | "Atalhos";
  area: Area;
  /** Outras palavras que também encontram o item. */
  palavras?: string;
};

type Definicao = Omit<ItemDaBusca, "area"> & { somenteAdmin?: boolean };

const ITENS_DAS_AREAS: Partial<Record<Area, Definicao[]>> = {
  aulas: [
    {
      rotulo: "Novo aluno",
      href: "/aulas/alunos/novo",
      grupo: "Ações rápidas",
      somenteAdmin: true,
      palavras: "cadastrar matricular",
    },
    {
      rotulo: "Nova turma",
      href: "/aulas/turmas/nova",
      grupo: "Ações rápidas",
      somenteAdmin: true,
    },
    { rotulo: "Alunos", href: "/aulas/alunos", grupo: "Atalhos", palavras: "estudantes" },
    {
      rotulo: "Planos",
      href: "/aulas/planos",
      grupo: "Atalhos",
      somenteAdmin: true,
      palavras: "mensalidade valor",
    },
  ],
  mensalidades: [
    {
      rotulo: "Inadimplentes",
      href: "/mensalidades/inadimplentes",
      grupo: "Atalhos",
      palavras: "atraso devendo",
    },
  ],
  horarios: [
    {
      rotulo: "Bloquear horário",
      href: "/horarios/bloquear",
      grupo: "Ações rápidas",
      somenteAdmin: true,
      palavras: "fechar quadra manutenção evento",
    },
    {
      rotulo: "Bloqueios semanais",
      href: "/horarios/semanais",
      grupo: "Atalhos",
      palavras: "toda semana repetir",
    },
  ],
  contabil: [
    {
      rotulo: "Baixar lançamentos (CSV)",
      href: "/contabil/exportar",
      grupo: "Atalhos",
      palavras: "planilha exportar",
    },
  ],
};

/** VIVO-CA-03: áreas e ações que o perfil pode abrir pela busca rápida, na ordem do menu. */
export function itensDaBusca(areas: readonly string[], admin: boolean): ItemDaBusca[] {
  const permitidas = AREAS.filter((a) => areas.includes(a));
  const doMenu: ItemDaBusca[] = permitidas.map((area) => ({
    rotulo: MENU[area].rotulo,
    href: MENU[area].href,
    grupo: "Áreas",
    area,
  }));
  const extras = permitidas.flatMap((area) =>
    (ITENS_DAS_AREAS[area] ?? [])
      .filter((item) => admin || !item.somenteAdmin)
      .map((item) => ({
        rotulo: item.rotulo,
        href: item.href,
        grupo: item.grupo,
        palavras: item.palavras,
        area,
      })),
  );
  return [
    ...extras.filter((i) => i.grupo === "Ações rápidas"),
    ...doMenu,
    ...extras.filter((i) => i.grupo === "Atalhos"),
  ];
}

/** Sem acento e em minúsculas, para "horarios" achar "Horários". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Itens cujo rótulo ou palavras contêm todos os termos digitados. */
export function filtrarBusca(itens: readonly ItemDaBusca[], termo: string): ItemDaBusca[] {
  const partes = normalizar(termo).split(/\s+/).filter(Boolean);
  if (partes.length === 0) return [...itens];
  return itens.filter((item) => {
    const alvo = normalizar(`${item.rotulo} ${item.palavras ?? ""} ${MENU[item.area].rotulo}`);
    return partes.every((p) => alvo.includes(p));
  });
}
