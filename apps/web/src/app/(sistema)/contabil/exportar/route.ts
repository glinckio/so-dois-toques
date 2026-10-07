import { consultaDoPeriodo, csvDosLancamentos } from "@/lib/contabil/formatacao";
import type { LancamentoExportado } from "@/lib/contabil/tipos";
import { chamarApi } from "@/lib/servidor/api";

/** CONT-CA-09: planilha dos lançamentos (a API confere o perfil e registra na auditoria). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const consulta = consultaDoPeriodo({
    competencia: url.searchParams.get("competencia") ?? undefined,
    de: url.searchParams.get("de") ?? undefined,
    ate: url.searchParams.get("ate") ?? undefined,
  });
  const resposta = await chamarApi<{
    periodo: { de: string; ate: string };
    lancamentos: LancamentoExportado[];
  }>(`/contabil/lancamentos${consulta ? `?${consulta}` : ""}`);
  if (!resposta.ok) return new Response(resposta.mensagem, { status: resposta.status });
  const { periodo, lancamentos } = resposta.dados;
  return new Response(csvDosLancamentos(lancamentos), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lancamentos-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
