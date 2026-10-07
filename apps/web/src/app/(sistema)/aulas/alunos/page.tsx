import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  AcessoNegado,
  Aviso,
  classeBotao,
  classeBotaoSecundario,
  classeCampo,
} from "@/components/ui";
import { formatarTelefone } from "@/lib/aulas/formatacao";
import type { PaginaAlunos } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Alunos | Só Dois Toques" };

const SITUACOES = { ativos: "Ativos", inativos: "Inativos", todos: "Todos" } as const;

export default async function PaginaAlunos({ searchParams }: PageProps<"/aulas/alunos">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const parametros = await searchParams;
  const busca = typeof parametros.busca === "string" ? parametros.busca.slice(0, 120) : "";
  const situacao =
    typeof parametros.situacao === "string" && parametros.situacao in SITUACOES
      ? (parametros.situacao as keyof typeof SITUACOES)
      : "ativos";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const consulta = new URLSearchParams({ situacao, pagina: String(pagina) });
  if (busca) consulta.set("busca", busca);
  const resposta = await chamarApi<PaginaAlunos>(`/alunos?${consulta.toString()}`);
  const admin = usuario.perfil === "ADMINISTRADOR";
  const totalPaginas = resposta.ok
    ? Math.max(1, Math.ceil(resposta.dados.total / resposta.dados.tamanho))
    : 1;
  const link = (p: number) => {
    const c = new URLSearchParams(consulta);
    c.set("pagina", String(p));
    return `/aulas/alunos?${c.toString()}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{admin ? "Alunos" : "Meus alunos"}</h1>
        {admin && (
          <Link href="/aulas/alunos/novo" className={classeBotao}>
            Novo aluno
          </Link>
        )}
      </div>
      <form
        method="get"
        role="search"
        className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nome ou telefone
          <input name="busca" defaultValue={busca} className={classeCampo} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Situação
          <select name="situacao" defaultValue={situacao} className={classeCampo}>
            {Object.entries(SITUACOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={classeBotaoSecundario}>
          Buscar
        </button>
      </form>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.itens.length === 0 ? (
        <p className="text-suave">Nenhum aluno encontrado.</p>
      ) : (
        <>
          <ul className="divide-borda flex flex-col divide-y" aria-label="Alunos">
            {resposta.dados.itens.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/aulas/alunos/${a.id}`}
                  className="hover:bg-elevado flex justify-between gap-2 py-3"
                >
                  <span className="font-medium">{a.nome}</span>
                  <span className="text-suave text-sm">
                    {a.anonimizado
                      ? "anonimizado"
                      : a.ativo
                        ? formatarTelefone(a.telefone)
                        : "inativo"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <nav aria-label="Páginas" className="flex items-center gap-3">
            {pagina > 1 && (
              <Link href={link(pagina - 1)} className={classeBotaoSecundario}>
                Anterior
              </Link>
            )}
            <span className="text-sm">
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas && (
              <Link href={link(pagina + 1)} className={classeBotaoSecundario}>
                Próxima
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  );
}
