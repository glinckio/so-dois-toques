import { LinkDoCartao } from "@/components/base/cartao";
import { Destaque } from "@/components/base/cabecalho";
import { PontoVivo } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Icone } from "@/components/icones";
import { desdeQuando } from "@/lib/caixa/painel";
import type { Turno } from "@/lib/caixa/tipos";
import { FormAbertura } from "./form-abertura";
import { TempoAberto } from "./tempo-aberto";

/**
 * Painel do caixa aberto: brilho verde e ponto pulsando (o caixa está vivo), há
 * quanto tempo está aberto, atualizando sozinho (VIVO-CA-08), quem abriu, o troco e o
 * dinheiro que deveria estar na gaveta agora.
 */
export function CaixaAberto({ turno, agora }: { turno: Turno; agora: Date }) {
  const desde = desdeQuando(turno.abertaEm, agora);
  return (
    <section
      aria-label="Caixa aberto"
      className="border-sucesso/30 relative isolate flex flex-col gap-6 overflow-hidden rounded-[2rem] border bg-linear-to-br from-[#0c2a26] via-[#110f2c] to-[#120c2b] p-6 shadow-[0_30px_70px_-34px_rgb(52_211_153_/_0.55)] sm:p-7"
    >
      <span
        aria-hidden="true"
        className="bg-sucesso/20 absolute -top-28 -right-20 -z-10 size-80 rounded-full blur-3xl"
      />
      <span
        aria-hidden="true"
        className="bg-roxo/15 absolute -bottom-32 -left-16 -z-10 size-72 rounded-full blur-3xl"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="border-sucesso/30 bg-sucesso/10 text-sucesso inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-[0.16em] uppercase">
          <PontoVivo tom="sucesso" />
          Caixa aberto
        </h2>
        <LinkDoCartao href={`/caixa/turnos/${turno.id}`}>Ver o turno</LinkDoCartao>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
        <div className="flex flex-col gap-2">
          <p data-testid="tempo-aberto" className="flex flex-col gap-1">
            <span className="text-suave text-sm font-semibold">Aberto há</span>{" "}
            <TempoAberto
              desde={turno.abertaEm}
              agora={agora.toISOString()}
              className="text-[2.75rem] leading-none font-extrabold tracking-tight sm:text-5xl"
            />
          </p>
          {desde.outroDia && (
            <p className="text-ouro flex items-center gap-2 text-sm font-semibold">
              <Icone nome="alerta" width={16} height={16} />
              Aberto desde outro dia: confira a gaveta e feche o turno.
            </p>
          )}
        </div>

        <div data-testid="turno-aberto" className="flex flex-col gap-3">
          <p className="text-suave text-sm">
            Desde <time dateTime={turno.abertaEm}>{desde.texto}</time>, por{" "}
            <strong className="text-texto">{turno.abertaPor}</strong>
          </p>
          <dl className="grid grid-cols-2 gap-2.5">
            <div className="bg-noite/35 flex flex-col justify-between gap-1 rounded-2xl border border-white/8 p-3.5">
              <dt className="text-apagado flex items-start gap-1.5 text-[0.68rem] leading-snug font-bold tracking-[0.1em] uppercase sm:tracking-[0.14em]">
                <Icone nome="caixa" width={14} height={14} className="mt-px shrink-0" />
                troco
              </dt>{" "}
              <dd className="text-xl font-extrabold sm:text-2xl">
                <Valor centavos={turno.trocoInicialCentavos} />
              </dd>
            </div>
            <div className="border-sucesso/20 bg-sucesso/8 flex flex-col justify-between gap-1 rounded-2xl border p-3.5">
              <dt className="text-sucesso flex items-start gap-1.5 text-[0.68rem] leading-snug font-bold tracking-[0.1em] uppercase sm:tracking-[0.14em]">
                <Icone nome="dinheiro" width={14} height={14} className="mt-px shrink-0" />
                esperado em dinheiro
              </dt>{" "}
              <dd className="text-xl font-extrabold sm:text-2xl">
                <Valor centavos={turno.esperadoDinheiroCentavos} />
              </dd>
            </div>
          </dl>
          <p className="text-apagado text-xs">
            Esperado na gaveta: troco + dinheiro que entrou − dinheiro que saiu no turno.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Caixa fechado: um cartão dourado para contar o troco e abrir o turno. */
export function CaixaFechado() {
  return (
    <section
      aria-label="Caixa fechado"
      className="border-ouro/30 relative isolate grid gap-6 overflow-hidden rounded-[2rem] border bg-linear-to-br from-[#2b2008] via-[#140d26] to-[#120c2b] p-6 sm:p-7 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center"
    >
      <span
        aria-hidden="true"
        className="bg-ouro/15 absolute -top-28 -left-16 -z-10 size-80 rounded-full blur-3xl"
      />
      <span
        aria-hidden="true"
        className="bg-roxo/20 absolute -right-20 -bottom-32 -z-10 size-72 rounded-full blur-3xl"
      />
      <div className="flex flex-col gap-3">
        <h2 className="border-ouro/30 bg-ouro/10 text-ouro inline-flex w-fit items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-[0.16em] uppercase">
          <span aria-hidden="true" className="bg-ouro/70 size-2.5 rounded-full" />
          Caixa fechado
        </h2>
        <p className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance sm:text-[2.1rem]">
          Conte o troco e <Destaque>abra o turno</Destaque>
        </p>
        <p className="text-suave max-w-md text-sm">
          Abra o caixa para lançar avulsos. Pagamentos registrados com o caixa fechado ficam sem
          turno.
        </p>
      </div>
      <FormAbertura />
    </section>
  );
}
