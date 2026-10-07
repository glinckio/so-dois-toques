import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { BarrasHorizontais, Progresso } from "@/components/graficos/barras-horizontais";
import { BarrasMensais } from "@/components/graficos/barras-mensais";
import { TabelaMensal } from "@/components/graficos/tabela-mensal";
import { Icone, type NomeIcone } from "@/components/icones";
import { Aviso, classeCartao } from "@/components/ui";
import { type Area, PERFIS } from "@/lib/acesso/areas";
import { diaDaSemana, horaDe, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { TurmaResumo } from "@/lib/aulas/tipos";
import type { Turno } from "@/lib/caixa/tipos";
import { formatarPorcentagem, ORIGENS_RECEITA } from "@/lib/contabil/formatacao";
import type { Painel } from "@/lib/contabil/tipos";
import type { Produto } from "@/lib/estoque/tipos";
import { faixaDeHoras } from "@/lib/horarios/formatacao";
import type { Grade } from "@/lib/horarios/tipos";
import { formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import type { CaixaDoDia, Inadimplentes } from "@/lib/mensalidades/tipos";
import { ocupacaoDoDia, reservasDoDia, turmasDoDia, variacao } from "@/lib/painel/inicio";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import { exigirUsuario } from "@/lib/servidor/sessao";

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function talvez<T>(sim: boolean, chamada: () => Promise<RespostaApi<T>>) {
  return sim ? chamada() : Promise.resolve(null);
}

/** VIS-CA-04 e 05: o Início mostra o resumo de cada área que o perfil acessa. */
export default async function Inicio({ searchParams }: PageProps<"/">) {
  // Renderização por requisição: o nonce da CSP é aplicado a cada acesso.
  await connection();
  const usuario = await exigirUsuario();
  const { senha } = await searchParams;
  const pode = (area: Area) => usuario.areas.includes(area);
  const hoje = hojeEmSaoPaulo();

  const [painel, caixa, sessao, inadimplentes, grade, produtos, turmas] = await Promise.all([
    talvez(pode("contabil"), () => chamarApi<Painel>("/contabil/painel")),
    talvez(pode("caixa"), () => chamarApi<CaixaDoDia>(`/caixa/lancamentos?data=${hoje}`)),
    talvez(pode("caixa"), () => chamarApi<{ turno: Turno | null }>("/caixa/sessao")),
    talvez(pode("caixa"), () => chamarApi<Inadimplentes>("/mensalidades/inadimplentes")),
    talvez(pode("horarios"), () => chamarApi<Grade>(`/horarios/grade?data=${hoje}`)),
    talvez(pode("estoque"), () => chamarApi<Produto[]>("/produtos")),
    talvez(pode("aulas"), () => chamarApi<TurmaResumo[]>("/turmas?situacao=ativas")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-ouro text-sm font-medium first-letter:uppercase">
          {DATA_LONGA.format(new Date(`${hoje}T12:00:00Z`))}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Olá, {usuario.nome}.</h1>
        <p className="text-suave">{PERFIS[usuario.perfil]} · Só Dois Toques, São Leopoldo</p>
      </header>
      {senha === "trocada" && <Aviso tipo="sucesso">Senha alterada com sucesso.</Aviso>}

      {painel && <Financeiro resposta={painel} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {caixa && sessao && inadimplentes && (
          <CartaoCaixa caixa={caixa} sessao={sessao} inadimplentes={inadimplentes} />
        )}
        {grade && <CartaoQuadras resposta={grade} />}
        {turmas && <CartaoAulas resposta={turmas} diaSemana={diaDaSemana(hoje)} />}
        {produtos && <CartaoEstoque resposta={produtos} />}
      </div>
    </div>
  );
}

function Financeiro({ resposta }: { resposta: RespostaApi<Painel> }) {
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const p = resposta.dados;
  const anterior = p.comparativo.at(-2);
  const aReceber = p.aReceber.mensalidades.valorCentavos + p.aReceber.reservas.valorCentavos;
  return (
    <>
      <section aria-labelledby="titulo-mes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-mes" className="text-lg font-semibold">
            Resumo de {nomeDoMes(p.periodo.de.slice(0, 7)).toLowerCase()}
          </h2>
          <Link href="/contabil" className="text-roxo text-sm font-medium hover:underline">
            Ver o Contábil
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            rotulo="Receitas"
            icone="subir"
            valor={p.totalReceitas}
            mudanca={anterior ? variacao(p.totalReceitas, anterior.receitas) : null}
          />
          <Kpi
            rotulo="Despesas"
            icone="descer"
            valor={p.totalDespesas}
            mudanca={anterior ? variacao(p.totalDespesas, anterior.despesas) : null}
            subirEhRuim
          />
          <Kpi
            rotulo="Resultado"
            icone="contabil"
            valor={p.resultado}
            mudanca={anterior ? variacao(p.resultado, anterior.resultado) : null}
            destaque
          />
          <Kpi
            rotulo="A receber"
            icone="relogio"
            valor={aReceber}
            nota={`${p.aReceber.mensalidades.quantidade} mensalidades e ${p.aReceber.reservas.quantidade} reservas`}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <section
          aria-labelledby="titulo-12-meses"
          className={`${classeCartao} flex flex-col gap-4`}
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="titulo-12-meses" className="text-lg font-semibold">
              Receitas e despesas
            </h2>
            <p className="text-apagado text-sm">Últimos 12 meses, regime de caixa</p>
          </div>
          <BarrasMensais meses={p.comparativo} />
          <details className="group text-sm">
            <summary className="text-roxo cursor-pointer font-medium">Ver em tabela</summary>
            <div className="mt-3">
              <TabelaMensal meses={p.comparativo} />
            </div>
          </details>
        </section>
        <section aria-labelledby="titulo-origens" className={`${classeCartao} flex flex-col gap-4`}>
          <div className="flex flex-col gap-0.5">
            <h2 id="titulo-origens" className="text-lg font-semibold">
              De onde veio a receita
            </h2>
            <p className="text-apagado text-sm">
              Margem do mês: {formatarPorcentagem(p.margemPercentual)}
            </p>
          </div>
          <BarrasHorizontais
            rotulo="Receitas por origem"
            linhas={Object.entries(ORIGENS_RECEITA).map(
              ([chave, nome]) => [nome, p.receitas[chave as keyof Painel["receitas"]]] as const,
            )}
          />
        </section>
      </div>
    </>
  );
}

function Kpi({
  rotulo,
  icone,
  valor,
  mudanca,
  nota,
  destaque = false,
  subirEhRuim = false,
}: {
  rotulo: string;
  icone: NomeIcone;
  valor: number;
  mudanca?: number | null;
  nota?: string;
  destaque?: boolean;
  subirEhRuim?: boolean;
}) {
  const bom = mudanca != null && (subirEhRuim ? mudanca <= 0 : mudanca >= 0);
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 ${destaque ? "border-roxo/50 bg-roxo-forte/20" : "border-borda bg-cartao"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-suave text-sm">{rotulo}</span>
        <span className="bg-elevado text-roxo grid size-8 place-items-center rounded-full">
          <Icone nome={icone} width={16} height={16} />
        </span>
      </div>
      <span
        className={`text-xl font-bold tabular-nums sm:text-2xl ${valor < 0 ? "text-perigo" : ""}`}
        data-testid={`kpi-${rotulo}`}
      >
        {formatarReais(valor)}
      </span>
      {nota ? (
        <span className="text-apagado text-xs">{nota}</span>
      ) : mudanca == null ? (
        <span className="text-apagado text-xs">Sem mês anterior para comparar</span>
      ) : (
        <span className="flex items-center gap-1 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${bom ? "bg-sucesso/15 text-sucesso" : "bg-perigo/15 text-perigo"}`}
          >
            <Icone nome={mudanca >= 0 ? "subir" : "descer"} width={12} height={12} />
            {formatarPorcentagem(Math.abs(mudanca))}
          </span>
          <span className="text-apagado">em relação ao mês anterior</span>
        </span>
      )}
    </div>
  );
}

function Cartao({
  titulo,
  icone,
  href,
  acao,
  children,
}: {
  titulo: string;
  icone: NomeIcone;
  href: string;
  acao: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={titulo} className={`${classeCartao} flex flex-col gap-4`}>
      <div className="flex items-center gap-3">
        <span className="bg-roxo-forte/25 text-roxo grid size-9 place-items-center rounded-xl">
          <Icone nome={icone} width={18} height={18} />
        </span>
        <h2 className="text-lg font-semibold">{titulo}</h2>
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
      <Link href={href} className="text-roxo text-sm font-medium hover:underline">
        {acao}
      </Link>
    </section>
  );
}

function CartaoCaixa({
  caixa,
  sessao,
  inadimplentes,
}: {
  caixa: RespostaApi<CaixaDoDia>;
  sessao: RespostaApi<{ turno: Turno | null }>;
  inadimplentes: RespostaApi<Inadimplentes>;
}) {
  const turno = sessao.ok ? sessao.dados.turno : null;
  return (
    <Cartao titulo="Caixa de hoje" icone="caixa" href="/caixa" acao="Abrir o caixa do dia">
      {caixa.ok ? (
        <>
          <p className="text-3xl font-bold tabular-nums" data-testid="saldo-do-dia">
            {formatarReais(caixa.dados.resumo.saldo)}
          </p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-apagado">Entradas</dt>
              <dd className="font-medium tabular-nums">
                {formatarReais(caixa.dados.resumo.entradas)}
              </dd>
            </div>
            <div>
              <dt className="text-apagado">Saídas</dt>
              <dd className="font-medium tabular-nums">
                {formatarReais(caixa.dados.resumo.saidas)}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <Aviso tipo="erro">{caixa.mensagem}</Aviso>
      )}
      <p className="flex items-center gap-2 text-sm" data-testid="situacao-caixa">
        <span
          aria-hidden
          className={`size-2.5 rounded-full ${turno ? "bg-sucesso" : "bg-apagado"}`}
        />
        {turno
          ? `Caixa aberto desde ${HORA.format(new Date(turno.abertaEm))} por ${turno.abertaPor}`
          : "Caixa fechado"}
      </p>
      {inadimplentes.ok && inadimplentes.dados.itens.length > 0 && (
        <Link
          href="/caixa/inadimplentes"
          className="border-ouro/40 bg-ouro/10 hover:bg-ouro/15 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
        >
          <Icone nome="alerta" width={16} height={16} className="text-ouro shrink-0" />
          {inadimplentes.dados.itens.length}{" "}
          {inadimplentes.dados.itens.length === 1 ? "aluno em atraso" : "alunos em atraso"}:{" "}
          {formatarReais(inadimplentes.dados.totalCentavos)}
        </Link>
      )}
    </Cartao>
  );
}

function CartaoQuadras({ resposta }: { resposta: RespostaApi<Grade> }) {
  if (!resposta.ok) {
    return (
      <Cartao titulo="Quadras hoje" icone="horarios" href="/horarios" acao="Ver a grade">
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      </Cartao>
    );
  }
  const { reservadas, abertas } = ocupacaoDoDia(resposta.dados);
  const reservas = reservasDoDia(resposta.dados);
  return (
    <Cartao titulo="Quadras hoje" icone="horarios" href="/horarios" acao="Ver a grade">
      <div className="flex flex-col gap-2">
        <p className="text-suave text-sm">
          <span className="text-texto text-2xl font-bold tabular-nums">{reservadas}</span> de{" "}
          {abertas} horas reservadas
        </p>
        <Progresso
          fracao={abertas > 0 ? reservadas / abertas : 0}
          rotulo={`${reservadas} de ${abertas} horas reservadas`}
        />
      </div>
      {reservas.length === 0 ? (
        <p className="text-apagado text-sm">Nenhuma reserva para hoje.</p>
      ) : (
        <ul className="divide-borda flex flex-col divide-y text-sm" aria-label="Reservas de hoje">
          {reservas.slice(0, 6).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block font-medium tabular-nums">
                  {faixaDeHoras(r.horaInicio, r.horaFim)}
                </span>
                <span className="text-apagado block truncate">
                  {r.quadra} · {r.clienteNome}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${r.pago ? "bg-sucesso/15 text-sucesso" : "bg-ouro/15 text-ouro"}`}
              >
                {r.pago ? "Pago" : "A pagar"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {reservas.length > 6 && (
        <p className="text-apagado text-xs">E mais {reservas.length - 6} reservas.</p>
      )}
    </Cartao>
  );
}

function CartaoAulas({
  resposta,
  diaSemana,
}: {
  resposta: RespostaApi<TurmaResumo[]>;
  diaSemana: number;
}) {
  const aulas = resposta.ok ? turmasDoDia(resposta.dados, diaSemana) : [];
  return (
    <Cartao titulo="Aulas de hoje" icone="aulas" href="/aulas" acao="Ver as turmas">
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : aulas.length === 0 ? (
        <p className="text-apagado text-sm">Nenhuma aula hoje.</p>
      ) : (
        <ul className="divide-borda flex flex-col divide-y text-sm" aria-label="Aulas de hoje">
          {aulas.map(({ turma, inicio, fim }) => (
            <li key={`${turma.id}-${inicio}`} className="flex items-center gap-3 py-2">
              <span className="w-24 shrink-0 font-medium tabular-nums">
                {horaDe(inicio)}–{horaDe(fim)}
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/aulas/turmas/${turma.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {turma.nome}
                </Link>
                <span className="text-apagado block truncate">{turma.local.nome}</span>
              </span>
              <span className="text-suave shrink-0 text-xs tabular-nums">
                {turma.ocupadas}/{turma.vagas}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

function CartaoEstoque({ resposta }: { resposta: RespostaApi<Produto[]> }) {
  const baixos = resposta.ok ? resposta.dados.filter((p) => p.ativo && p.abaixoDoMinimo) : [];
  return (
    <Cartao titulo="Estoque" icone="estoque" href="/estoque" acao="Ver o estoque">
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : baixos.length === 0 ? (
        <p className="text-suave text-sm" data-testid="estoque-baixo">
          Todos os produtos acima do mínimo.
        </p>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm" data-testid="estoque-baixo">
            <Icone nome="alerta" width={16} height={16} className="text-ouro" />
            {baixos.length} {baixos.length === 1 ? "produto abaixo" : "produtos abaixo"} do mínimo
          </p>
          <ul
            className="divide-borda flex flex-col divide-y text-sm"
            aria-label="Produtos abaixo do mínimo"
          >
            {baixos.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{p.nome}</span>
                <span className="text-apagado shrink-0 tabular-nums">
                  {p.saldo} de {p.estoqueMinimo}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Cartao>
  );
}
