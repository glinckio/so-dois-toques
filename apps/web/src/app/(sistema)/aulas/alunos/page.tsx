import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/base/avatar";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { PilulasDeLinks } from "@/components/base/pilulas";
import { Vazio } from "@/components/base/vazio";
import { Icone } from "@/components/icones";
import {
  AcessoNegado,
  Aviso,
  Campo,
  classeBotao,
  classeBotaoIcone,
  classeBotaoSecundario,
  SetaDoBotao,
} from "@/components/ui";
import { formatarTelefone } from "@/lib/aulas/formatacao";
import type { AlunoResumo, PaginaAlunos } from "@/lib/aulas/tipos";
import { porInicial } from "@/lib/aulas/visual";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Alunos | Só Dois Toques" };

const SITUACOES = { ativos: "Ativos", inativos: "Inativos", todos: "Todos" } as const;

/**
 * Alunos: busca com ícone (a busca rápida do sistema chega aqui com `?busca=`),
 * filtros de situação em pílula e a lista com avatar e telefone, por inicial.
 */
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
  const linkDaSituacao = (s: keyof typeof SITUACOES) => {
    const c = new URLSearchParams({ situacao: s });
    if (busca) c.set("busca", busca);
    return `/aulas/alunos?${c.toString()}`;
  };
  const total = resposta.ok ? resposta.dados.total : 0;

  return (
    <>
      <Cabecalho
        etiqueta="Aulas"
        icone="usuarios"
        titulo={
          admin ? (
            <>
              <Destaque>Alunos</Destaque> da escola
            </>
          ) : (
            <>
              Meus <Destaque>alunos</Destaque>
            </>
          )
        }
        descricao={
          resposta.ok
            ? `${total} ${total === 1 ? "aluno" : "alunos"} ${
                situacao === "todos"
                  ? "no total"
                  : situacao === "ativos"
                    ? total === 1
                      ? "ativo"
                      : "ativos"
                    : total === 1
                      ? "inativo"
                      : "inativos"
              }${busca ? ` para “${busca}”` : ""}.`
            : undefined
        }
        acoes={
          admin && (
            <Link href="/aulas/alunos/novo" className={classeBotao}>
              <Icone nome="mais" width={18} height={18} />
              Novo aluno
              <SetaDoBotao />
            </Link>
          )
        }
      />

      <section
        aria-label="Buscar alunos"
        className="superficie flex flex-col gap-4 rounded-[1.75rem] p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <form
          method="get"
          role="search"
          className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="situacao" value={situacao} />
          <div className="min-w-0 flex-1">
            <Campo
              rotulo="Nome ou telefone"
              id="busca"
              icone="busca"
              type="search"
              defaultValue={busca}
              maxLength={120}
              placeholder="Digite parte do nome ou do telefone"
              autoComplete="off"
            />
          </div>
          <button type="submit" className={classeBotaoSecundario}>
            Buscar
          </button>
        </form>
        <PilulasDeLinks
          rotulo="Situação dos alunos"
          itens={(Object.keys(SITUACOES) as (keyof typeof SITUACOES)[]).map((s) => ({
            href: linkDaSituacao(s),
            rotulo: SITUACOES[s],
            atual: s === situacao,
          }))}
        />
      </section>
      {busca && (
        <p className="text-suave -mt-2 flex flex-wrap items-center gap-2 px-1 text-sm">
          Buscando por <strong className="text-texto">“{busca}”</strong>
          <Link
            href={`/aulas/alunos?situacao=${situacao}`}
            className="text-roxo-claro hover:text-texto inline-flex items-center gap-1 font-semibold"
          >
            <Icone nome="fechar" width={14} height={14} />
            Limpar busca
          </Link>
        </p>
      )}

      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.itens.length === 0 ? (
        <Vazio
          titulo="Nenhum aluno encontrado."
          acao={
            admin &&
            !busca && (
              <Link href="/aulas/alunos/novo" className={classeBotao}>
                <Icone nome="mais" width={18} height={18} />
                Novo aluno
              </Link>
            )
          }
        >
          {busca
            ? "Confira o nome ou tente só uma parte dele, ou os últimos dígitos do telefone."
            : "Os alunos cadastrados aparecem aqui, em ordem alfabética."}
        </Vazio>
      ) : (
        <>
          <ul
            className="superficie flex flex-col gap-1 rounded-[1.75rem] p-2 sm:p-3"
            aria-label="Alunos"
          >
            {porInicial(resposta.dados.itens).map((grupo) => (
              <li key={grupo.letra} className="flex gap-2 sm:gap-3">
                <span
                  aria-hidden="true"
                  className="text-roxo-claro w-6 shrink-0 pt-4 text-center text-xs font-extrabold sm:w-8"
                >
                  {grupo.letra}
                </span>
                <ul className="border-borda/60 flex min-w-0 flex-1 flex-col border-l pl-2 sm:pl-3">
                  {grupo.itens.map((a, i) => (
                    <LinhaDoAluno key={a.id} aluno={a} indice={i} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {totalPaginas > 1 && (
            <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
              {pagina > 1 ? (
                <Link href={link(pagina - 1)} className={classeBotaoIcone}>
                  <Icone nome="anterior" width={18} height={18} />
                  <span className="sr-only">Anterior</span>
                </Link>
              ) : (
                <span
                  className={`${classeBotaoIcone} pointer-events-none opacity-40`}
                  aria-hidden="true"
                >
                  <Icone nome="anterior" width={18} height={18} />
                </span>
              )}
              <span className="superficie rounded-full px-4 py-2 text-sm font-semibold tabular-nums">
                Página {pagina} de {totalPaginas}
              </span>
              {pagina < totalPaginas ? (
                <Link href={link(pagina + 1)} className={classeBotaoIcone}>
                  <Icone nome="proximo" width={18} height={18} />
                  <span className="sr-only">Próxima</span>
                </Link>
              ) : (
                <span
                  className={`${classeBotaoIcone} pointer-events-none opacity-40`}
                  aria-hidden="true"
                >
                  <Icone nome="proximo" width={18} height={18} />
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}

function LinhaDoAluno({ aluno, indice }: { aluno: AlunoResumo; indice: number }) {
  return (
    <li className={`animate-entrar atraso-${Math.min(24, indice + 1)}`}>
      <Link
        href={`/aulas/alunos/${aluno.id}`}
        className={`group hover:bg-elevado/70 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors sm:px-3 ${
          aluno.ativo && !aluno.anonimizado ? "" : "opacity-70"
        }`}
      >
        <Avatar nome={aluno.nome} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{aluno.nome}</span>
          <span className="text-apagado flex items-center gap-1.5 text-sm tabular-nums">
            {aluno.anonimizado ? (
              "anonimizado"
            ) : aluno.ativo ? (
              <>
                <Icone nome="telefone" width={13} height={13} />
                {formatarTelefone(aluno.telefone)}
              </>
            ) : (
              "inativo"
            )}
          </span>
        </span>
        <Icone
          nome="proximo"
          width={18}
          height={18}
          className="text-apagado shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}
