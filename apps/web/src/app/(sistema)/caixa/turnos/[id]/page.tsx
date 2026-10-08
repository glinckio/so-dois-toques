import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { BarraNivel } from "@/components/base/barra";
import { Cabecalho } from "@/components/base/cabecalho";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { visualDaCategoria } from "@/components/caixa/categorias";
import { LinhaDoTempo } from "@/components/caixa/linha-do-tempo";
import { BlocosDasFormas } from "@/components/caixa/resumo";
import { BotaoImprimir } from "@/components/mensalidades/botao-imprimir";
import { Aviso } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { tempoDecorrido } from "@/lib/base/tempo";
import { categoriasDoTurno, horaEmSaoPaulo, resultadoDoTurno } from "@/lib/caixa/painel";
import type { Turno } from "@/lib/caixa/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Turno do caixa | Só Dois Toques" };

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const TONS = { aberto: "sucesso", bateu: "sucesso", sobrou: "perigo", faltou: "perigo" } as const;

/** CAIXA-CA-05: relatório do turno, para conferir e imprimir. */
export default async function PaginaTurno({
  params,
  searchParams,
}: PageProps<"/caixa/turnos/[id]">) {
  await connection();
  const agora = new Date();
  const { id } = await params;
  const { fechado } = await searchParams;
  const resposta = await chamarApi<Turno>(`/caixa/sessoes/${encodeURIComponent(id)}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const t = resposta.dados;
  const aberto = !t.fechadaEm;
  const resultado = resultadoDoTurno(aberto ? null : t.diferencaCentavos);
  const diaAbertura = hojeEmSaoPaulo(new Date(t.abertaEm));
  const fim = t.fechadaEm ? new Date(t.fechadaEm) : agora;
  const variosDias = diaAbertura !== hojeEmSaoPaulo(fim);
  const categorias = categoriasDoTurno(t.porCategoria);
  const contado = t.contadoDinheiroCentavos;
  const escala = Math.max(t.esperadoDinheiroCentavos, contado ?? 0, 1);

  return (
    <>
      <Cabecalho
        etiqueta="Relatório do turno"
        icone="recibo"
        titulo={
          <>
            Turno do <span className="texto-marca print:bg-none print:text-black">caixa</span>
          </>
        }
        descricao={
          <span className="first-letter:uppercase">
            {DATA_LONGA.format(new Date(`${diaAbertura}T12:00:00Z`))} · {horaEmSaoPaulo(t.abertaEm)}
            {t.fechadaEm
              ? ` às ${horaEmSaoPaulo(t.fechadaEm)}${variosDias ? ` de ${formatarDataHora(t.fechadaEm).slice(0, 5)}` : ""} · durou ${tempoDecorrido(t.abertaEm, fim)}`
              : ` · aberto há ${tempoDecorrido(t.abertaEm, agora)}`}
          </span>
        }
        acoes={<BotaoImprimir />}
      />

      {fechado === "1" && (
        <Aviso tipo={t.diferencaCentavos === 0 ? "sucesso" : "info"}>
          Caixa fechado.{" "}
          {t.diferencaCentavos === 0
            ? "O dinheiro bateu."
            : `Diferença de ${formatarReais(t.diferencaCentavos ?? 0)}.`}
        </Aviso>
      )}

      <section
        aria-labelledby="titulo-conferencia"
        className="superficie-destaque relative flex flex-col gap-5 overflow-hidden rounded-[2rem] p-5 sm:p-7"
      >
        <span
          aria-hidden="true"
          className="bg-roxo/20 absolute -top-24 -right-16 size-72 rounded-full blur-3xl print:hidden"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <CabecalhoCartao
            id="titulo-conferencia"
            icone="dinheiro"
            tom={aberto ? "sucesso" : resultado.situacao === "bateu" ? "sucesso" : "perigo"}
            titulo="Conferência do dinheiro"
            descricao="Troco, o que devia estar na gaveta e o que foi contado"
          />
          <Selo tom={TONS[resultado.situacao]} pulsar={aberto}>
            {resultado.texto}
          </Selo>
        </div>

        <dl aria-label="Resumo do turno" className="relative grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Bloco rotulo="Troco inicial">
            <Valor centavos={t.trocoInicialCentavos} />
          </Bloco>
          <Bloco rotulo="Esperado em dinheiro">
            <Valor centavos={t.esperadoDinheiroCentavos} />
          </Bloco>
          {contado !== null && (
            <>
              <Bloco rotulo="Dinheiro contado">
                <Valor centavos={contado} />
              </Bloco>
              <Bloco rotulo="Diferença" tom={t.diferencaCentavos === 0 ? "sucesso" : "perigo"}>
                <Valor centavos={t.diferencaCentavos ?? 0} />
              </Bloco>
            </>
          )}
          <Pessoa rotulo="Aberto por" texto={`${t.abertaPor} em ${formatarDataHora(t.abertaEm)}`} />
          <Pessoa
            rotulo="Fechado por"
            texto={
              t.fechadaEm
                ? `${t.fechadaPor} em ${formatarDataHora(t.fechadaEm)}`
                : "Ainda não fechado"
            }
          />
          {t.observacao && (
            <div className="border-ouro/25 bg-ouro/8 col-span-full flex flex-col gap-1 rounded-2xl border p-4 print:border-black/30 print:bg-transparent">
              <dt className="text-ouro text-[0.68rem] font-bold tracking-[0.14em] uppercase print:text-black">
                Observação
              </dt>
              <dd className="text-sm">“{t.observacao}”</dd>
            </div>
          )}
        </dl>

        {contado !== null && (
          <div className="relative flex flex-col gap-2">
            <BarraNivel
              fracao={contado / escala}
              marca={t.esperadoDinheiroCentavos / escala}
              tom={t.diferencaCentavos === 0 ? "sucesso" : "perigo"}
              rotulo={`Contado ${formatarReais(contado)} para ${formatarReais(t.esperadoDinheiroCentavos)} esperados`}
            />
            <p className="text-apagado text-xs">
              A barra é o dinheiro contado; o traço marca o esperado.
            </p>
          </div>
        )}
      </section>

      <Cartao aria-labelledby="titulo-formas-turno" className="flex flex-col gap-5">
        <CabecalhoCartao
          id="titulo-formas-turno"
          icone="cartao"
          tom="areia"
          titulo="Por forma de pagamento"
          descricao="Saldo de cada forma no turno"
        />
        <BlocosDasFormas porForma={t.resumo.porForma} rotulo="Saldo do turno por forma" />
      </Cartao>

      {categorias.length > 0 && (
        <Cartao aria-labelledby="titulo-categorias" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-categorias"
            icone="porcentagem"
            titulo="Por categoria"
            descricao="Da que mais movimentou para a que menos"
          />
          <ul
            className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2"
            aria-label="Totais por categoria"
          >
            {categorias.map((c) => {
              const visual = visualDaCategoria(c.categoria);
              return (
                <li key={c.categoria} className="flex items-center gap-3">
                  <SeloIcone nome={visual.icone} tom={visual.tom} tamanho="p" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-semibold">{c.nome}</span>
                      <span className="text-apagado flex gap-3 text-xs tabular-nums">
                        <span>
                          <span className="text-sucesso print:text-black">+</span>{" "}
                          <Valor centavos={c.entradas} />
                        </span>
                        <span>
                          <span className="text-perigo print:text-black">−</span>{" "}
                          <Valor centavos={c.saidas} />
                        </span>
                      </span>
                    </span>
                    <BarraNivel
                      fracao={c.fracao}
                      tom={c.entradas >= c.saidas ? "sucesso" : "perigo"}
                      altura="h-1.5"
                      rotulo={`${c.nome}: entradas ${formatarReais(c.entradas)}, saídas ${formatarReais(c.saidas)}`}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </Cartao>
      )}

      <Cartao aria-labelledby="titulo-lancamentos-turno" className="flex flex-col gap-5">
        <CabecalhoCartao
          id="titulo-lancamentos-turno"
          icone="lista"
          titulo="Lançamentos"
          descricao={
            t.lancamentos.length === 0
              ? "Nada lançado no turno"
              : `${t.lancamentos.length} ${t.lancamentos.length === 1 ? "lançamento" : "lançamentos"}, na ordem em que entraram`
          }
        />
        {t.lancamentos.length === 0 ? (
          <Vazio compacto titulo="Nenhum lançamento no turno." />
        ) : (
          <LinhaDoTempo
            itens={t.lancamentos}
            rotulo="Lançamentos do turno"
            mostrarData={variosDias}
          />
        )}
        <div className="flex justify-end print:hidden">
          <LinkDoCartao href="/caixa/turnos">Todos os turnos</LinkDoCartao>
        </div>
      </Cartao>
    </>
  );
}

function Bloco({
  rotulo,
  tom,
  children,
}: {
  rotulo: string;
  tom?: "sucesso" | "perigo";
  children: ReactNode;
}) {
  const cores = {
    sucesso: "border-sucesso/30 bg-sucesso/10 text-sucesso",
    perigo: "border-perigo/30 bg-perigo/10 text-perigo",
  };
  return (
    <div
      className={`flex flex-col justify-between gap-1.5 rounded-2xl border p-4 print:border-black/30 print:bg-transparent print:text-black ${
        tom ? cores[tom] : "bg-noite/30 border-white/8"
      }`}
    >
      <dt className="text-apagado text-[0.68rem] leading-snug font-bold tracking-[0.1em] uppercase sm:tracking-[0.14em]">
        {rotulo}
      </dt>
      <dd className="text-xl font-extrabold tracking-tight sm:text-2xl">{children}</dd>
    </div>
  );
}

function Pessoa({ rotulo, texto }: { rotulo: string; texto: string }) {
  return (
    <div className="border-borda col-span-2 flex flex-col gap-1 rounded-2xl border px-4 py-3">
      <dt className="text-apagado text-[0.68rem] font-bold tracking-[0.14em] uppercase">
        {rotulo}
      </dt>
      <dd className="text-sm font-semibold">{texto}</dd>
    </div>
  );
}
