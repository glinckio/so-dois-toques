import { connection } from "next/server";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { BarrasMensais } from "@/components/graficos/barras-mensais";
import { TabelaMensal } from "@/components/graficos/tabela-mensal";
import type { NomeIcone } from "@/components/icones";
import { AulasDeHoje } from "@/components/inicio/aulas-hoje";
import { CartaoNumero } from "@/components/inicio/kpi";
import { LeituraDoMes } from "@/components/inicio/leitura";
import { MensalidadesEmAtraso } from "@/components/inicio/mensalidades-hoje";
import { Saudacao, type AcaoDoInicio, type AnelDoDia } from "@/components/inicio/saudacao";
import { Aviso } from "@/components/ui";
import { type Area, PERFIS } from "@/lib/acesso/areas";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { itensDaBusca } from "@/lib/base/busca";
import { leituraDoMes } from "@/lib/base/leitura";
import { mesesDoGrafico, NOMES_DO_GRAFICO, type Painel } from "@/lib/contabil/tipos";
import type { Grade } from "@/lib/horarios/tipos";
import { nomeDoMes } from "@/lib/mensalidades/formatacao";
import type { Inadimplentes } from "@/lib/mensalidades/tipos";
import { minutoEmSaoPaulo, resumoDasAulas, variacao } from "@/lib/painel/inicio";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import { exigirUsuario } from "@/lib/servidor/sessao";

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const ICONES_DAS_ACOES: Record<string, NomeIcone> = {
  "/horarios/bloquear": "bloqueio",
  "/aulas/alunos/novo": "pessoa",
  "/aulas/turmas/nova": "aulas",
};

function talvez<T>(sim: boolean, chamada: () => Promise<RespostaApi<T>>) {
  return sim ? chamada() : Promise.resolve(null);
}

function mesSemAno(competencia: string) {
  return nomeDoMes(competencia).split(" de ")[0]!.toLowerCase();
}

/**
 * FOCO-CA-10, VIS-CA-04 e 05: o Início abre com a saudação e o dia em anéis; mostra as
 * aulas de hoje na quadra e as mensalidades em atraso; o administrador vê também o
 * recebido no mês e os 12 meses.
 */
export default async function Inicio({ searchParams }: PageProps<"/">) {
  // Renderização por requisição: o nonce da CSP é aplicado a cada acesso.
  await connection();
  const usuario = await exigirUsuario();
  const { senha } = await searchParams;
  const pode = (area: Area) => usuario.areas.includes(area);
  const agora = new Date();
  const hoje = hojeEmSaoPaulo(agora);
  const minutoAtual = minutoEmSaoPaulo(agora);

  const [painel, inadimplentes, grade] = await Promise.all([
    talvez(pode("contabil"), () => chamarApi<Painel>("/contabil/painel")),
    talvez(pode("mensalidades"), () => chamarApi<Inadimplentes>("/mensalidades/inadimplentes")),
    talvez(pode("horarios"), () => chamarApi<Grade>(`/horarios/grade?data=${hoje}`)),
  ]);

  const aulas = grade?.ok ? grade.dados.aulas : [];
  const acoes: AcaoDoInicio[] = itensDaBusca(usuario.areas, usuario.perfil === "ADMINISTRADOR")
    .filter((i) => i.grupo === "Ações rápidas")
    .slice(0, 4)
    .map((i) => ({ rotulo: i.rotulo, href: i.href, icone: ICONES_DAS_ACOES[i.href] ?? "raio" }));

  const aneis: AnelDoDia[] = [];
  if (grade?.ok) {
    const r = resumoDasAulas(aulas, minutoAtual);
    aneis.push({
      titulo: "Aulas",
      fracao: r.total > 0 ? r.dadas / r.total : 0,
      centro: `${r.dadas}/${r.total}`,
      detalhe: r.total === 0 ? "nenhuma hoje" : `${r.dadas} de ${r.total} dadas`,
      tom: "roxo",
    });
    aneis.push({
      titulo: "Alunos",
      fracao: r.vagas > 0 ? r.alunos / r.vagas : 0,
      centro: String(r.alunos),
      detalhe: `${r.alunos} de ${r.vagas} vagas hoje`,
      tom: "areia",
    });
  }
  if (inadimplentes?.ok) {
    const n = inadimplentes.dados.itens.length;
    aneis.push({
      titulo: "Em atraso",
      fracao: n > 0 ? 1 : 0,
      centro: String(n),
      detalhe: n === 0 ? "ninguém em atraso" : n === 1 ? "aluno em atraso" : "alunos em atraso",
      tom: n > 0 ? "ouro" : "sucesso",
    });
  }

  const cartoesDoDia = [
    grade && (
      <AulasDeHoje
        key="aulas"
        aulas={aulas}
        erro={grade.ok ? undefined : grade.mensagem}
        minutoAtual={minutoAtual}
        linkDaTurma={pode("aulas")}
      />
    ),
    inadimplentes && <MensalidadesEmAtraso key="mensalidades" resposta={inadimplentes} />,
  ].filter(Boolean);

  return (
    <>
      <Saudacao
        nome={usuario.nome}
        perfil={usuario.perfil}
        rotuloPerfil={PERFIS[usuario.perfil]}
        data={DATA_LONGA.format(new Date(`${hoje}T12:00:00Z`))}
        acoes={acoes}
        aneis={aneis.slice(0, 3)}
      />
      {senha === "trocada" && <Aviso tipo="sucesso">Senha alterada com sucesso.</Aviso>}

      {painel && <Financeiro resposta={painel} />}

      {cartoesDoDia.length > 0 && (
        <div
          className={`grid items-start gap-4 ${cartoesDoDia.length > 1 ? "lg:grid-cols-2" : ""}`}
        >
          {cartoesDoDia}
        </div>
      )}
    </>
  );
}

function Financeiro({ resposta }: { resposta: RespostaApi<Painel> }) {
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const p = resposta.dados;
  const anterior = p.comparativo.at(-2);
  const mesAnterior = anterior ? mesSemAno(anterior.competencia) : undefined;
  const ultimos = p.comparativo.slice(-12);
  const meses = mesesDoGrafico(p.comparativo);
  const frases = leituraDoMes({
    comparativo: p.comparativo,
    recebido: p.recebido,
    estornos: p.estornos,
    resultado: p.resultado,
    aReceberCentavos: p.aReceber.valorCentavos,
    mensalidadesVencidas: p.aReceber.quantidade,
  });
  return (
    <>
      <section aria-labelledby="titulo-mes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 id="titulo-mes" className="text-xl font-bold">
            Mensalidades de {nomeDoMes(p.periodo.de.slice(0, 7)).toLowerCase()}
          </h2>
          <LinkDoCartao href="/contabil">Ver o Contábil</LinkDoCartao>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CartaoNumero
            rotulo="Recebido"
            icone="subir"
            tom="roxo"
            valor={p.recebido}
            serie={ultimos.map((m) => m.recebido)}
            mudanca={anterior ? variacao(p.recebido, anterior.recebido) : null}
            mesAnterior={mesAnterior}
          />
          <CartaoNumero
            rotulo="Estornos"
            icone="descer"
            tom="ouro"
            valor={p.estornos}
            serie={ultimos.map((m) => m.estornos)}
            mudanca={anterior ? variacao(p.estornos, anterior.estornos) : null}
            mesAnterior={mesAnterior}
            subirEhRuim
          />
          <CartaoNumero
            rotulo="Resultado"
            icone="contabil"
            tom="sucesso"
            valor={p.resultado}
            serie={ultimos.map((m) => m.resultado)}
            mudanca={anterior ? variacao(p.resultado, anterior.resultado) : null}
            mesAnterior={mesAnterior}
            destaque
          />
          <CartaoNumero
            rotulo="A receber"
            icone="relogio"
            tom="areia"
            valor={p.aReceber.valorCentavos}
            nota={`${p.aReceber.quantidade} ${p.aReceber.quantidade === 1 ? "mensalidade vencida" : "mensalidades vencidas"}`}
          />
        </div>
      </section>

      <Cartao aria-labelledby="titulo-12-meses" className="flex flex-col gap-5">
        <CabecalhoCartao
          id="titulo-12-meses"
          icone="contabil"
          titulo="Recebido e estornos"
          descricao="Últimos 12 meses, regime de caixa"
        />
        <BarrasMensais meses={meses} nomes={NOMES_DO_GRAFICO} />
        <details className="group text-sm">
          <summary className="text-roxo-claro hover:text-texto inline-flex items-center gap-1 font-semibold">
            Ver em tabela
          </summary>
          <div className="animate-entrar mt-3">
            <TabelaMensal meses={meses} nomes={NOMES_DO_GRAFICO} />
          </div>
        </details>
      </Cartao>

      {frases.length > 0 && <LeituraDoMes frases={frases} />}
    </>
  );
}
