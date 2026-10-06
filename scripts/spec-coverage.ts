const CRITERION_LINE = /\b([A-Z]+-CA-\d{2,})\b/;

export type Criterion = { id: string; manual: boolean };

/** Lê os critérios de aceite de uma spec. Linhas marcadas com [manual] não exigem teste automatizado. */
export function extractCriteria(specText: string): Criterion[] {
  const criteria = new Map<string, Criterion>();
  for (const line of specText.split("\n")) {
    const match = line.match(CRITERION_LINE);
    if (!match || !/^\s*[-*|#]/.test(line)) continue;
    const id = match[1]!;
    if (!criteria.has(id)) criteria.set(id, { id, manual: line.includes("[manual]") });
  }
  return [...criteria.values()];
}

/** Devolve os critérios automatizáveis que não aparecem em nenhum arquivo de teste. */
export function findUncoveredCriteria(criteria: Criterion[], testTexts: string[]): string[] {
  return criteria
    .filter((criterion) => !criterion.manual)
    .filter((criterion) => !testTexts.some((text) => text.includes(criterion.id)))
    .map((criterion) => criterion.id);
}
