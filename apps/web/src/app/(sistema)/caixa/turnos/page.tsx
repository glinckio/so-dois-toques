import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Selo } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { Icone } from "@/components/icones";
import { Aviso } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { tempoDecorrido } from "@/lib/base/tempo";
import { horaEmSaoPaulo, resultadoDoTurno, resumoDosTurnos } from "@/lib/caixa/painel";
import type { TurnoResumo } from "@/lib/caixa/tipos";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Turnos do caixa | Só Dois Toques" };

const DIA_DA_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const MES_CURTO = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });

const TONS = { aberto: "sucesso", bateu: "sucesso", sobrou: "perigo", faltou: "perigo" } as const;

/** CAIXA-CA-05: turnos, mais recentes primeiro, com quem abriu e fechou e se o dinheiro bateu. */
export default async function PaginaTurnos() {
  await connection();
  const agora = new Date();
  const resposta = await chamarApi<TurnoResumo[]>("/caixa/sessoes");
  const turnos = resposta.ok ? resposta.dados : [];

  return (
    <>
      <Cabecalho
        etiqueta="Caixa"
        icone="relogio"
        titulo={
          <>
            Turnos do <Destaque>caixa</Destaque>
          </>
        }
        descricao={resumoDosTurnos(turnos.map((t) => (t.fechadaEm ? t.diferencaCentavos : null)))}
      />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : turnos.length === 0 ? (
        <Vazio titulo="O caixa ainda não foi aberto nenhuma vez.">
          Abra o caixa no Caixa do dia para começar o primeiro turno.
        </Vazio>
      ) : (
        <ul className="flex flex-col gap-2.5" aria-label="Turnos">
          {turnos.map((t, i) => {
            const dia = hojeEmSaoPaulo(new Date(t.abertaEm));
            const meio = new Date(`${dia}T12:00:00Z`);
            const resultado = resultadoDoTurno(t.fechadaEm ? t.diferencaCentavos : null);
            const aberto = !t.fechadaEm;
            return (
              <li key={t.id} className={`animate-entrar atraso-${Math.min(24, i * 2)}`}>
                <Link
                  href={`/caixa/turnos/${t.id}`}
                  className={`group flex items-center gap-4 rounded-[1.5rem] p-3.5 transition duration-200 hover:-translate-y-px sm:p-4 ${
                    aberto
                      ? "border-sucesso/35 border bg-linear-to-r from-[#0c2a26] to-[#120c2b]"
                      : "superficie hover:border-[#3a2f6b]"
                  }`}
                >
                  <span
                    className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl leading-none ${
                      aberto ? "bg-sucesso/15 text-sucesso" : "bg-elevado text-texto"
                    }`}
                  >
                    <span className="text-xl font-extrabold tabular-nums">{dia.slice(8, 10)}</span>
                    <span className="text-apagado mt-0.5 text-[0.65rem] font-bold uppercase">
                      {MES_CURTO.format(meio).replace(".", "")}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold capitalize">
                        {DIA_DA_SEMANA.format(meio).replace(".", "")}, {horaEmSaoPaulo(t.abertaEm)}
                        {t.fechadaEm ? ` às ${horaEmSaoPaulo(t.fechadaEm)}` : ""}
                      </span>
                      {aberto ? (
                        <Selo tom="sucesso" pulsar>
                          Aberto
                        </Selo>
                      ) : (
                        <>
                          <Selo tom="neutro">Fechado</Selo>
                          <Selo tom={TONS[resultado.situacao]}>{resultado.texto}</Selo>
                        </>
                      )}
                    </span>
                    <span className="text-apagado text-sm">
                      Aberto por {t.abertaPor}
                      {t.fechadaEm
                        ? ` · fechado por ${t.fechadaPor} · durou ${tempoDecorrido(t.abertaEm, new Date(t.fechadaEm))}`
                        : ` · aberto agora, há ${tempoDecorrido(t.abertaEm, agora)}`}
                    </span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end text-right sm:flex">
                    <span className="text-apagado text-[0.68rem] font-bold tracking-[0.14em] uppercase">
                      Troco
                    </span>
                    <Valor centavos={t.trocoInicialCentavos} className="font-bold" />
                  </span>
                  <Icone
                    nome="proximo"
                    width={18}
                    height={18}
                    className="text-apagado group-hover:text-texto hidden shrink-0 transition-transform group-hover:translate-x-0.5 sm:block"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
