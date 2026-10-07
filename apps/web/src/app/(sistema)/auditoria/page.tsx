import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/base/avatar";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Cartao } from "@/components/base/cartao";
import { PilulasDeLinks } from "@/components/base/pilulas";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { Icone, type NomeIcone } from "@/components/icones";
import {
  AcessoNegado,
  Aviso,
  classeBotao,
  classeBotaoFantasma,
  classeBotaoIcone,
  classeCampo,
  classeRotulo,
  Campo,
} from "@/components/ui";
import {
  agruparPorDia,
  detalhesLegiveis,
  eventoDaAuditoria,
  filtroAuditoria,
  formatarDataHora,
  horaDoRegistro,
  linkPagina,
  periodosRapidos,
  ROTULOS_ACOES,
  TAMANHO_PAGINA,
} from "@/lib/acesso/auditoria";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Auditoria | Só Dois Toques" };

type Registro = {
  id: string;
  criadaEm: string;
  acao: keyof typeof ROTULOS_ACOES;
  atorId: string | null;
  atorNome: string | null;
  alvoTipo: string | null;
  alvoId: string | null;
  ip: string | null;
  detalhes: unknown;
};
type Pagina = { total: number; pagina: number; tamanho: number; itens: Registro[] };
type Usuario = { id: string; nome: string; email: string };

export default async function PaginaAuditoria({ searchParams }: PageProps<"/auditoria">) {
  await connection();
  const { permitido } = await exigirArea("auditoria");
  if (!permitido) return <AcessoNegado />;

  const { filtro, consulta } = filtroAuditoria(await searchParams);
  const [registros, usuarios] = await Promise.all([
    chamarApi<Pagina>(`/auditoria?${consulta.toString()}`),
    chamarApi<Usuario[]>("/usuarios"),
  ]);
  const agora = new Date();
  const totalPaginas = registros.ok
    ? Math.max(1, Math.ceil(registros.dados.total / TAMANHO_PAGINA))
    : 1;
  const filtrando = Boolean(filtro.inicio || filtro.fim || filtro.usuarioId || filtro.acao);
  const nomeDoUsuario = usuarios.ok
    ? usuarios.dados.find((u) => u.id === filtro.usuarioId)?.nome
    : undefined;

  return (
    <>
      <Cabecalho
        etiqueta="Gestão"
        icone="auditoria"
        titulo={
          <>
            <Destaque>Auditoria</Destaque> do sistema
          </>
        }
        descricao="Quem fez o quê e quando: entradas, cadastros, dinheiro e alertas de segurança. Nada aqui pode ser apagado ou editado."
      />

      <Cartao className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PilulasDeLinks rotulo="Período rápido" itens={periodosRapidos(filtro, agora)} />
          {filtrando && (
            <Link href="/auditoria" className={`${classeBotaoFantasma} min-h-10 px-3 text-sm`}>
              <Icone nome="fechar" width={16} height={16} />
              Limpar filtros
            </Link>
          )}
        </div>
        <form
          method="get"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_1.5fr_auto] lg:items-end"
        >
          <Campo
            rotulo="De"
            id="inicio"
            type="date"
            icone="calendario"
            defaultValue={filtro.inicio}
          />
          <Campo rotulo="Até" id="fim" type="date" icone="calendario" defaultValue={filtro.fim} />
          <Escolha id="usuarioId" rotulo="Usuário" icone="pessoa" valor={filtro.usuarioId}>
            <option value="">Todos</option>
            {usuarios.ok &&
              usuarios.dados.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.email})
                </option>
              ))}
          </Escolha>
          <Escolha id="acao" rotulo="Ação" icone="raio" valor={filtro.acao}>
            <option value="">Todas</option>
            {Object.entries(ROTULOS_ACOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Escolha>
          <button type="submit" className={`${classeBotao} sm:col-span-2 lg:col-span-1`}>
            <Icone nome="busca" width={18} height={18} />
            Filtrar
          </button>
        </form>
        {filtrando && (
          <p className="text-suave flex flex-wrap items-center gap-2 text-sm">
            <span className="text-apagado">Mostrando só:</span>
            {(filtro.inicio || filtro.fim) && (
              <Selo tom="roxo" semPonto>
                {filtro.inicio ? formatarDia(filtro.inicio) : "o começo"} até{" "}
                {filtro.fim ? formatarDia(filtro.fim) : "hoje"}
              </Selo>
            )}
            {filtro.usuarioId && (
              <Selo tom="roxo" semPonto>
                {nomeDoUsuario ?? "um usuário"}
              </Selo>
            )}
            {filtro.acao && (
              <Selo tom="roxo" semPonto>
                {ROTULOS_ACOES[filtro.acao as keyof typeof ROTULOS_ACOES]}
              </Selo>
            )}
          </p>
        )}
      </Cartao>

      {!registros.ok ? (
        <Aviso tipo="erro">{registros.mensagem}</Aviso>
      ) : registros.dados.itens.length === 0 ? (
        <Vazio
          titulo="Nenhum registro encontrado."
          acao={
            filtrando ? (
              <Link href="/auditoria" className={`${classeBotaoFantasma} text-sm`}>
                Ver todos os registros
              </Link>
            ) : undefined
          }
        >
          {filtrando ? "Tente um período maior ou outra ação." : "Ainda não há nada registrado."}
        </Vazio>
      ) : (
        <Cartao className="flex flex-col gap-2">
          <p className="text-suave flex items-center gap-2 text-sm">
            <Icone nome="lista" width={16} height={16} className="text-roxo-claro" />
            <span>
              <strong className="text-texto tabular-nums">{registros.dados.total}</strong>{" "}
              {registros.dados.total === 1 ? "registro" : "registros"}
              {totalPaginas > 1 &&
                ` · mostrando ${(filtro.pagina - 1) * TAMANHO_PAGINA + 1} a ${Math.min(filtro.pagina * TAMANHO_PAGINA, registros.dados.total)}`}
            </span>
          </p>
          <ul className="flex flex-col gap-4" aria-label="Registros de auditoria">
            {agruparPorDia(registros.dados.itens, agora).map((grupo) => (
              <li key={grupo.dia} className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 py-2 text-sm font-bold">
                  <Icone nome="calendario" width={16} height={16} className="text-ouro" />
                  {grupo.rotulo}
                  <span className="text-apagado font-normal">
                    · {grupo.itens.length} {grupo.itens.length === 1 ? "registro" : "registros"}
                  </span>
                </h2>
                <ol className="flex flex-col">
                  {grupo.itens.map((r, i) => (
                    <Evento
                      key={r.id}
                      registro={r}
                      ultimo={i === grupo.itens.length - 1}
                      atraso={Math.min(i, 12)}
                    />
                  ))}
                </ol>
              </li>
            ))}
          </ul>
          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas"
              className="border-borda mt-2 flex items-center justify-between gap-3 border-t pt-4"
            >
              {filtro.pagina > 1 ? (
                <Link href={linkPagina(filtro, filtro.pagina - 1)} className={classeBotaoIcone}>
                  <Icone nome="anterior" />
                  <span className="sr-only">Anterior</span>
                </Link>
              ) : (
                <span className="size-11" />
              )}
              <span className="text-suave text-sm tabular-nums">
                Página <strong className="text-texto">{filtro.pagina}</strong> de {totalPaginas}
              </span>
              {filtro.pagina < totalPaginas ? (
                <Link href={linkPagina(filtro, filtro.pagina + 1)} className={classeBotaoIcone}>
                  <Icone nome="proximo" />
                  <span className="sr-only">Próxima</span>
                </Link>
              ) : (
                <span className="size-11" />
              )}
            </nav>
          )}
        </Cartao>
      )}
    </>
  );
}

/** Um registro na linha do tempo: o ícone do tipo de evento fica sobre o traço do dia. */
function Evento({
  registro: r,
  ultimo,
  atraso,
}: {
  registro: Registro;
  ultimo: boolean;
  atraso: number;
}) {
  const evento = eventoDaAuditoria(r.acao);
  const campos = detalhesLegiveis(r.detalhes);
  return (
    <li className={`animate-entrar atraso-${atraso} relative flex gap-3 pb-4 sm:gap-4`}>
      {!ultimo && (
        <span
          aria-hidden="true"
          className="bg-borda absolute top-11 bottom-0 left-[1.15rem] w-px sm:left-5"
        />
      )}
      <SeloIcone nome={evento.icone} tom={evento.tom} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-semibold">{ROTULOS_ACOES[r.acao] ?? r.acao}</p>
          <time
            dateTime={r.criadaEm}
            title={formatarDataHora(r.criadaEm)}
            className="text-apagado text-sm tabular-nums"
          >
            {horaDoRegistro(r.criadaEm)}
          </time>
        </div>
        <p className="text-suave flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {r.atorNome ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar nome={r.atorNome} tamanho="p" className="size-6! text-[0.6rem]!" />
              {r.atorNome}
            </span>
          ) : (
            <span className="text-apagado">Sistema ou visitante</span>
          )}
          <span className="text-apagado">· {evento.assunto}</span>
          {r.ip && <span className="text-apagado">· IP {r.ip}</span>}
        </p>
        {campos.length > 0 && (
          <dl className="flex flex-wrap gap-1.5">
            {campos.map((c) => (
              <div
                key={c.campo}
                className="bg-elevado/70 border-borda max-w-full rounded-full border px-2.5 py-1 text-xs"
              >
                <dt className="text-apagado inline">{c.campo}: </dt>
                <dd className="text-suave inline break-all">{c.valor}</dd>
              </div>
            ))}
          </dl>
        )}
        {r.detalhes !== null && r.detalhes !== undefined && (
          <details className="group text-xs">
            <summary className="text-apagado hover:text-roxo-claro inline-flex min-h-8 cursor-pointer list-none items-center gap-1 select-none">
              <Icone
                nome="proximo"
                width={14}
                height={14}
                className="transition-transform group-open:rotate-90"
              />
              Registro completo
            </summary>
            <pre className="bg-noite/60 border-borda text-suave mt-1 overflow-x-auto rounded-xl border p-3 font-mono text-[0.7rem] leading-relaxed whitespace-pre-wrap">
              {formatarDataHora(r.criadaEm)}
              {"\n"}
              {JSON.stringify(r.detalhes, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </li>
  );
}

/** Select com ícone à esquerda e a seta à direita, no mesmo formato dos campos. */
function Escolha({
  id,
  rotulo,
  icone,
  valor,
  children,
}: {
  id: string;
  rotulo: string;
  icone: NomeIcone;
  valor: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={classeRotulo}>
        {rotulo}
      </label>
      <div className="relative">
        <Icone
          nome={icone}
          width={18}
          height={18}
          className="text-apagado pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
        />
        <select
          id={id}
          name={id}
          defaultValue={valor ?? ""}
          className={`${classeCampo} appearance-none truncate pr-10 pl-11`}
        >
          {children}
        </select>
        <Icone
          nome="abaixo"
          width={18}
          height={18}
          className="text-apagado pointer-events-none absolute top-1/2 right-4 -translate-y-1/2"
        />
      </div>
    </div>
  );
}

function formatarDia(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}
