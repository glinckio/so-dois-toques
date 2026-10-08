import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { gerarMensalidades } from "@/app/acoes/mensalidades";
import { Anel } from "@/components/base/anel";
import { Avatar } from "@/components/base/avatar";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Linha } from "@/components/base/linha";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { PilulasDeLinks } from "@/components/base/pilulas";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { BotaoAcao } from "@/components/botao-acao";
import { SeloDaSituacao } from "@/components/caixa/situacao";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotao, classeBotaoSecundario } from "@/components/ui";
import { formatarData } from "@/lib/aulas/formatacao";
import {
  competenciaAtual,
  competenciaValida,
  deslocarMes,
  FORMAS,
  nomeDoMes,
  SITUACOES,
  type Situacao,
} from "@/lib/mensalidades/formatacao";
import { fracaoRecebida } from "@/lib/mensalidades/painel";
import type { ListaMensalidades } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Mensalidades | Só Dois Toques" };

const classeMes =
  "border-borda bg-elevado/60 text-suave hover:border-roxo/50 hover:text-texto inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition duration-200 active:scale-[0.97]";

const FUNDOS: Record<Situacao, string> = {
  EM_ABERTO: "",
  ATRASADA: "bg-perigo/6",
  PAGA: "",
  CANCELADA: "opacity-70",
};

/** "outubro de 2026" vira "outubro". */
function soOMes(competencia: string) {
  return nomeDoMes(competencia).split(" de ")[0]!;
}

/** MENS-CA-15: mensalidades do mês, com filtros em pílula, busca e totais. */
export default async function PaginaMensalidades({
  searchParams,
}: PageProps<"/caixa/mensalidades">) {
  await connection();
  const { usuario } = await exigirArea("caixa");
  const parametros = await searchParams;
  const pedida = typeof parametros.competencia === "string" ? parametros.competencia : undefined;
  const competencia = competenciaValida(pedida) ? pedida : competenciaAtual();
  const situacao =
    typeof parametros.situacao === "string" && parametros.situacao in SITUACOES
      ? (parametros.situacao as Situacao)
      : undefined;
  const busca = typeof parametros.busca === "string" ? parametros.busca.slice(0, 120) : "";
  const consulta = new URLSearchParams({ competencia });
  if (situacao) consulta.set("situacao", situacao);
  if (busca.trim()) consulta.set("busca", busca.trim());
  const resposta = await chamarApi<ListaMensalidades>(`/mensalidades?${consulta}`);
  const admin = usuario.perfil === "ADMINISTRADOR";
  const mes = nomeDoMes(competencia);
  const anterior = deslocarMes(competencia, -1);
  const proximo = deslocarMes(competencia, 1);
  const link = (mesEscolhido: string) => `/caixa/mensalidades?competencia=${mesEscolhido}`;
  const comFiltro = (s?: Situacao) => {
    const q = new URLSearchParams({ competencia });
    if (s) q.set("situacao", s);
    if (busca.trim()) q.set("busca", busca.trim());
    return `/caixa/mensalidades?${q}`;
  };

  return (
    <>
      <Cabecalho
        etiqueta="Mensalidades"
        icone="aulas"
        titulo={
          <>
            Mensalidades de <Destaque>{mes}</Destaque>
          </>
        }
        descricao="O que cada aluno paga no mês: filtre pela situação, busque pelo nome e registre o pagamento."
        acoes={
          <>
            <nav aria-label="Mês" className="flex items-center gap-2">
              <Link href={link(anterior)} className={classeMes}>
                <Icone nome="anterior" width={16} height={16} />
                {soOMes(anterior)}
              </Link>
              <Link href={link(proximo)} className={classeMes}>
                {soOMes(proximo)}
                <Icone nome="proximo" width={16} height={16} />
              </Link>
            </nav>
            {admin && (
              <BotaoAcao
                acao={gerarMensalidades}
                campos={{ competencia }}
                rotulo={`Gerar mensalidades de ${mes}`}
                className={classeBotao}
              />
            )}
          </>
        }
      />

      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <Totais totais={resposta.dados.totais} />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <PilulasDeLinks
          rotulo="Situação"
          itens={[
            { href: comFiltro(), rotulo: "Todas", atual: !situacao },
            ...(Object.entries(SITUACOES) as [Situacao, string][]).map(([valor, rotulo]) => ({
              href: comFiltro(valor),
              rotulo,
              atual: situacao === valor,
            })),
          ]}
        />
        <form
          action="/caixa/mensalidades"
          className="flex items-end gap-2 lg:w-[26rem]"
          role="search"
        >
          <input type="hidden" name="competencia" value={competencia} />
          {situacao && <input type="hidden" name="situacao" value={situacao} />}
          <div className="min-w-0 flex-1">
            <Campo
              rotulo="Aluno"
              id="busca"
              type="search"
              icone="busca"
              defaultValue={busca}
              placeholder="Nome do aluno"
            />
          </div>
          <button type="submit" className={classeBotaoSecundario}>
            Filtrar
          </button>
        </form>
      </div>

      {resposta.ok && (
        <div className="superficie flex flex-col gap-1 rounded-[1.75rem] p-2 sm:p-3">
          {resposta.dados.itens.length === 0 ? (
            <Vazio
              compacto
              titulo={`Nenhuma mensalidade${situacao || busca ? " com esse filtro" : " neste mês"}.`}
            >
              {situacao || busca
                ? "Troque a situação ou limpe a busca para ver as outras."
                : admin
                  ? "Use o botão de gerar para criar as cobranças dos alunos com plano."
                  : "As cobranças aparecem aqui quando o administrador gerar o mês."}
            </Vazio>
          ) : (
            <ul className="flex flex-col gap-1" aria-label="Mensalidades">
              {resposta.dados.itens.map((m, i) => (
                <li key={m.id} className={`animate-entrar atraso-${Math.min(24, i + 1)}`}>
                  <Linha
                    href={`/caixa/mensalidades/${m.id}`}
                    className={FUNDOS[m.situacao]}
                    inicio={<Avatar nome={m.aluno.nome} />}
                    titulo={m.aluno.nome}
                    detalhe={
                      <>
                        <span className="block truncate sm:inline">
                          Vence em {formatarData(m.vencimento)}
                        </span>
                        {m.pagamento && (
                          <span className="block truncate sm:inline">
                            <span className="hidden sm:inline"> · </span>
                            pago em {formatarData(m.pagamento.data)} ({FORMAS[m.pagamento.forma]})
                          </span>
                        )}
                      </>
                    }
                    fim={
                      <span className="flex flex-col items-end gap-1">
                        <Valor
                          centavos={m.valorCentavos}
                          className={`font-extrabold ${m.situacao === "CANCELADA" ? "text-apagado line-through" : ""}`}
                        />
                        <SeloDaSituacao situacao={m.situacao} />
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

/** Totais do mês: o anel mostra quanto do previsto já entrou (com o mesmo em texto). */
function Totais({ totais }: { totais: ListaMensalidades["totais"] }) {
  const fracao = fracaoRecebida(totais);
  const pct = Math.round(fracao * 100);
  return (
    <section
      aria-label="Totais do mês"
      className="superficie-destaque relative grid grid-cols-1 gap-6 overflow-hidden rounded-[2rem] p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-7"
    >
      <span
        aria-hidden="true"
        className="bg-roxo/25 absolute -top-24 -left-16 size-72 rounded-full blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        <Anel
          fracao={fracao}
          tom="sucesso"
          tamanho={112}
          espessura={10}
          rotulo={`${pct}% do previsto já foi recebido`}
        >
          <span className="flex flex-col">
            <span className="text-2xl font-extrabold tabular-nums">{pct}%</span>
            <span className="text-apagado text-[0.65rem] font-bold tracking-[0.12em] uppercase">
              recebido
            </span>
          </span>
        </Anel>
        <p className="text-suave text-sm sm:hidden">
          {totais.quantidade} {totais.quantidade === 1 ? "mensalidade" : "mensalidades"} no mês
        </p>
      </div>
      <dl className="relative grid grid-cols-2 gap-3 min-[420px]:grid-cols-3">
        <Total
          rotulo="Previsto"
          valor={totais.previsto}
          nota={`${totais.quantidade} no mês`}
          className="col-span-2 min-[420px]:col-span-1"
        />
        <Total rotulo="Recebido" valor={totais.recebido} tom="text-sucesso" />
        <Total rotulo="Em aberto" valor={totais.emAberto} tom="text-ouro" />
      </dl>
    </section>
  );
}

function Total({
  rotulo,
  valor,
  tom = "",
  nota,
  className = "",
}: {
  rotulo: string;
  valor: number;
  tom?: string;
  nota?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-noite/30 flex min-w-0 flex-col gap-1.5 rounded-2xl border border-white/8 p-4 ${className}`}
    >
      <dt className="text-apagado text-[0.68rem] font-bold tracking-[0.14em] uppercase">
        {rotulo}
      </dt>
      <dd>
        <NumeroAnimado
          valor={valor}
          centavosMenores
          className={`text-xl leading-none font-extrabold tracking-tight min-[420px]:text-2xl ${tom}`}
        />
      </dd>
      {nota && <dd className="text-apagado hidden text-xs sm:block">{nota}</dd>}
    </div>
  );
}
