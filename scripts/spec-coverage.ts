const CRITERION_LINE = /\b([A-Z]+-CA-\d{2,})\b/;

export type SpecStatus = "rascunho" | "aprovada" | "implementada" | "removida";

/**
 * Lê a linha "Status: ..." da spec. Spec sem status é tratada como implementada,
 * para que esquecer a linha nunca desligue a verificação. "removida" é a etapa cuja
 * funcionalidade saiu do sistema: a spec fica como histórico e não exige testes.
 */
export function extractStatus(specText: string): SpecStatus {
  const match = specText.match(
    /^\s*\**Status:?\**:?\s*(rascunho|aprovada|implementada|removida)\b/im,
  );
  return (match?.[1]?.toLowerCase() as SpecStatus | undefined) ?? "implementada";
}

export type Criterion = { id: string; manual: boolean };

/**
 * Lê os critérios de aceite de uma spec. Linhas marcadas com [manual] não exigem teste
 * automatizado; linhas marcadas com [removido ...] são critérios que saíram do sistema
 * e nem entram na lista.
 */
export function extractCriteria(specText: string): Criterion[] {
  const criteria = new Map<string, Criterion>();
  for (const line of specText.split("\n")) {
    const match = line.match(CRITERION_LINE);
    if (!match || !/^\s*[-*|#]/.test(line) || line.includes("[removido")) continue;
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
