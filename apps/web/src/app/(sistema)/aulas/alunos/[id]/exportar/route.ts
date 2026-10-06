import { chamarApi } from "@/lib/servidor/api";

/** AULAS-CA-07: baixa os dados do aluno em JSON (a API confere o perfil e registra na auditoria). */
export async function GET(_: Request, { params }: RouteContext<"/aulas/alunos/[id]/exportar">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Aluno inválido.", { status: 400 });
  const resposta = await chamarApi<unknown>(`/alunos/${id}/exportacao`);
  if (!resposta.ok) return new Response(resposta.mensagem, { status: resposta.status });
  return new Response(JSON.stringify(resposta.dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="aluno-${id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
