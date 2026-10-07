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
    {
      rotulo: "Locais",
      href: "/aulas/locais",
      grupo: "Atalhos",
      somenteAdmin: true,
      palavras: "quadra parceira",
    },
    { rotulo: "Custos das quadras", href: "/aulas/custos", grupo: "Atalhos", somenteAdmin: true },
    {
      rotulo: "Resultado das aulas",
      href: "/aulas/resultado",
      grupo: "Atalhos",
      somenteAdmin: true,
    },
  ],
  horarios: [
    {
      rotulo: "Nova reserva",
      href: "/horarios/nova",
      grupo: "Ações rápidas",
      palavras: "alugar quadra agendar",
    },
    {
      rotulo: "Reservas fixas",
      href: "/horarios/fixas",
      grupo: "Atalhos",
      palavras: "mensal semanal",
    },
    {
      rotulo: "Preços e quadras",
      href: "/horarios/faixas",
      grupo: "Atalhos",
      palavras: "valor hora faixa",
    },
  ],
  estoque: [
    {
      rotulo: "Registrar venda",
      href: "/estoque/venda",
      grupo: "Ações rápidas",
      palavras: "vender lanchonete copa",
    },
    {
      rotulo: "Registrar compra",
      href: "/estoque/compra",
      grupo: "Ações rápidas",
      palavras: "entrada fornecedor",
    },
    { rotulo: "Vendas do dia", href: "/estoque/vendas", grupo: "Atalhos" },
  ],
  caixa: [
    {
      rotulo: "Lançar no caixa",
      href: "/caixa",
      grupo: "Ações rápidas",
      palavras: "sangria suprimento despesa receita avulso",
    },
    {
      rotulo: "Mensalidades",
      href: "/caixa/mensalidades",
      grupo: "Atalhos",
      palavras: "pagamento receber",
    },
    {
      rotulo: "Inadimplentes",
      href: "/caixa/inadimplentes",
      grupo: "Atalhos",
      palavras: "atraso devendo",
    },
    {
      rotulo: "Turnos do caixa",
      href: "/caixa/turnos",
      grupo: "Atalhos",
      palavras: "fechamento abertura",
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
