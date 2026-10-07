import { connection } from "next/server";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { BarrasMensais } from "@/components/graficos/barras-mensais";
import { Rosca } from "@/components/graficos/rosca";
import { TabelaMensal } from "@/components/graficos/tabela-mensal";
import type { NomeIcone } from "@/components/icones";
import { AulasDeHoje } from "@/components/inicio/aulas-hoje";
import { CaixaDeHoje } from "@/components/inicio/caixa-hoje";
import { EstoqueDeHoje } from "@/components/inicio/estoque-hoje";
import { CartaoNumero } from "@/components/inicio/kpi";
import { LeituraDoMes } from "@/components/inicio/leitura";
import { QuadrasDeHoje } from "@/components/inicio/quadras-hoje";
import { Saudacao, type AcaoDoInicio, type AnelDoDia } from "@/components/inicio/saudacao";
import { Aviso } from "@/components/ui";
import { type Area, PERFIS } from "@/lib/acesso/areas";
import { diaDaSemana, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { TurmaResumo } from "@/lib/aulas/tipos";
import { itensDaBusca } from "@/lib/base/busca";
import { leituraDoMes } from "@/lib/base/leitura";
import type { Turno } from "@/lib/caixa/tipos";
import { formatarPorcentagem, ORIGENS_RECEITA } from "@/lib/contabil/formatacao";
import type { Painel } from "@/lib/contabil/tipos";
import type { Produto } from "@/lib/estoque/tipos";
import type { Grade } from "@/lib/horarios/tipos";
import { formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import type { CaixaDoDia, Inadimplentes } from "@/lib/mensalidades/tipos";
import {
  minutoEmSaoPaulo,
  momentoDe,
  ocupacaoDoDia,
  turmasDoDia,
  variacao,
  type TurmaDeHoje,
} from "@/lib/painel/inicio";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import { exigirUsuario } from "@/lib/servidor/sessao";

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const ICONES_DAS_ACOES: Record<string, NomeIcone> = {
  "/horarios/nova": "horarios",
  "/estoque/venda": "carrinho",
  "/caixa": "caixa",
  "/aulas/alunos/novo": "pessoa",
  "/aulas/turmas/nova": "aulas",
  "/estoque/compra": "sacola",
};

function talvez<T>(sim: boolean, chamada: () => Promise<RespostaApi<T>>) {
  return sim ? chamada() : Promise.resolve(null);
}

function mesSemAno(competencia: string) {
  return nomeDoMes(competencia).split(" de ")[0]!.toLowerCase();
}

/**
 * VIS-CA-04 e 05: o Início abre com a saudação e o dia em anéis; o administrador vê
 * os números do mês, o gráfico de 12 meses e a rosca das receitas; cada perfil vê o
 * resumo das áreas que acessa.
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

  const [painel, caixa, sessao, inadimplentes, grade, produtos, turmas] = await Promise.all([
    talvez(pode("contabil"), () => chamarApi<Painel>("/contabil/painel")),
    talvez(pode("caixa"), () => chamarApi<CaixaDoDia>(`/caixa/lancamentos?data=${hoje}`)),
    talvez(pode("caixa"), () => chamarApi<{ turno: Turno | null }>("/caixa/sessao")),
    talvez(pode("caixa"), () => chamarApi<Inadimplentes>("/mensalidades/inadimplentes")),
    talvez(pode("horarios"), () => chamarApi<Grade>(`/horarios/grade?data=${hoje}`)),
    talvez(pode("estoque"), () => chamarApi<Produto[]>("/produtos")),
    talvez(pode("aulas"), () => chamarApi<TurmaResumo[]>("/turmas?situacao=ativas")),
  ]);

  const aulas: TurmaDeHoje[] = turmas?.ok ? turmasDoDia(turmas.dados, diaDaSemana(hoje)) : [];
  const acoes: AcaoDoInicio[] = itensDaBusca(usuario.areas, usuario.perfil === "ADMINISTRADOR")
    .filter((i) => i.grupo === "Ações rápidas")
    .slice(0, 4)
    .map((i) => ({ rotulo: i.rotulo, href: i.href, icone: ICONES_DAS_ACOES[i.href] ?? "raio" }));

  const aneis: AnelDoDia[] = [];
  if (turmas?.ok) {
    const dadas = aulas.filter((a) => momentoDe(a.inicio, a.fim, minutoAtual) === "passou").length;
    aneis.push({
      titulo: "Aulas",
      fracao: aulas.length > 0 ? dadas / aulas.length : 0,
      centro: `${dadas}/${aulas.length}`,
      detalhe: aulas.length === 0 ? "nenhuma hoje" : `${dadas} de ${aulas.length} dadas`,
      tom: "roxo",
    });
    if (!pode("horarios")) {
      const vagas = aulas.reduce((t, a) => t + a.turma.vagas, 0);
      const ocupadas = aulas.reduce((t, a) => t + a.turma.ocupadas, 0);
      aneis.push({
        titulo: "Alunos",
        fracao: vagas > 0 ? ocupadas / vagas : 0,
        centro: String(ocupadas),
        detalhe: `${ocupadas} de ${vagas} vagas hoje`,
        tom: "ouro",
      });
    }
  }
  if (grade?.ok) {
    const { reservadas, abertas } = ocupacaoDoDia(grade.dados);
    const fracao = abertas > 0 ? reservadas / abertas : 0;
    aneis.push({
      titulo: "Quadras",
      fracao,
      centro: `${Math.round(fracao * 100)}%`,
      detalhe: `${reservadas} de ${abertas} h reservadas`,
      tom: "areia",
    });
  }
  if (produtos?.ok) {
    const ativos = produtos.dados.filter((p) => p.ativo);
    const emDia = ativos.filter((p) => !p.abaixoDoMinimo).length;
    aneis.push({
      titulo: "Estoque",
      fracao: ativos.length > 0 ? emDia / ativos.length : 0,
      centro: `${emDia}/${ativos.length}`,
      detalhe: "produtos em dia",
      tom: "sucesso",
    });
  }

  const cartoesDoDia = [
    caixa && sessao && inadimplentes && (
      <CaixaDeHoje
        key="caixa"
        caixa={caixa}
        turno={sessao.ok ? sessao.dados.turno : null}
        inadimplentes={inadimplentes}
        agora={agora}
      />
    ),
    grade && <QuadrasDeHoje key="quadras" resposta={grade} minutoAtual={minutoAtual} />,
    turmas && (
      <AulasDeHoje
        key="aulas"
        aulas={aulas}
        erro={turmas.ok ? undefined : turmas.mensagem}
        minutoAtual={minutoAtual}
      />
    ),
    produtos && <EstoqueDeHoje key="estoque" resposta={produtos} />,
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
          className={`grid items-start gap-4 ${cartoesDoDia.length > 1 ? "lg:grid-cols-2" : ""} [&>:last-child:nth-child(odd)]:lg:col-span-2`}
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
  const ultimos = p.comparativo.slice(-6);
  const aReceber = p.aReceber.mensalidades.valorCentavos + p.aReceber.reservas.valorCentavos;
  const frases = leituraDoMes({
    comparativo: p.comparativo,
    receitas: p.receitas,
    nomesDasOrigens: ORIGENS_RECEITA,
    totalReceitas: p.totalReceitas,
    totalDespesas: p.totalDespesas,
    resultado: p.resultado,
    aReceberCentavos: aReceber,
    mensalidadesVencidas: p.aReceber.mensalidades.quantidade,
  });
  return (
    <>
      <section aria-labelledby="titulo-mes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 id="titulo-mes" className="text-xl font-bold">
            Resumo de {nomeDoMes(p.periodo.de.slice(0, 7)).toLowerCase()}
          </h2>
          <LinkDoCartao href="/contabil">Ver o Contábil</LinkDoCartao>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CartaoNumero
            rotulo="Receitas"
            icone="subir"
            tom="roxo"
            valor={p.totalReceitas}
            serie={ultimos.map((m) => m.receitas)}
            mudanca={anterior ? variacao(p.totalReceitas, anterior.receitas) : null}
            mesAnterior={mesAnterior}
          />
          <CartaoNumero
            rotulo="Despesas"
            icone="descer"
            tom="ouro"
            valor={p.totalDespesas}
            serie={ultimos.map((m) => m.despesas)}
            mudanca={anterior ? variacao(p.totalDespesas, anterior.despesas) : null}
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
            valor={aReceber}
            nota={`${p.aReceber.mensalidades.quantidade} mensalidades e ${p.aReceber.reservas.quantidade} reservas`}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <Cartao aria-labelledby="titulo-12-meses" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-12-meses"
            icone="contabil"
            titulo="Receitas e despesas"
            descricao="Últimos 12 meses, regime de caixa"
          />
          <BarrasMensais meses={p.comparativo} />
          <details className="group text-sm">
            <summary className="text-roxo-claro hover:text-texto inline-flex items-center gap-1 font-semibold">
              Ver em tabela
            </summary>
            <div className="animate-entrar mt-3">
              <TabelaMensal meses={p.comparativo} />
            </div>
          </details>
        </Cartao>
        <Cartao aria-labelledby="titulo-origens" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-origens"
            icone="porcentagem"
            tom="ouro"
            titulo="De onde veio a receita"
            descricao={`Margem do mês: ${formatarPorcentagem(p.margemPercentual)}`}
          />
          <Rosca
            rotulo="Receitas por origem"
            partes={Object.entries(ORIGENS_RECEITA).map(([chave, nome]) => ({
              nome,
              valor: p.receitas[chave as keyof Painel["receitas"]],
            }))}
            centro={
              <span className="flex flex-col">
                <span className="text-apagado text-[0.65rem] font-bold tracking-[0.14em] uppercase">
                  Total
                </span>
                <span className="text-base font-extrabold tabular-nums">
                  {formatarReais(p.totalReceitas).replace(/,\d+$/, "")}
                </span>
              </span>
            }
          />
        </Cartao>
      </div>

      {frases.length > 0 && <LeituraDoMes frases={frases} />}
    </>
  );
}
