import Link from "next/link";
import { Anel } from "@/components/base/anel";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { Selo } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { Aviso } from "@/components/ui";
import { faixaDeHoras } from "@/lib/horarios/formatacao";
import type { Grade } from "@/lib/horarios/tipos";
import {
  mapaDoDia,
  ocupacaoDoDia,
  proximasReservas,
  reservasDoDia,
  type MapaDoDia,
} from "@/lib/painel/inicio";
import type { RespostaApi } from "@/lib/servidor/api";

/**
 * Quadras hoje: a ocupação em anel, o mapa do dia (uma faixa por quadra com as
 * reservas no lugar e a linha do "agora") e as próximas reservas.
 */
export function QuadrasDeHoje({
  resposta,
  minutoAtual,
}: {
  resposta: RespostaApi<Grade>;
  minutoAtual: number;
}) {
  const cabecalho = (
    <CabecalhoCartao
      id="titulo-quadras-hoje"
      icone="horarios"
      tom="areia"
      titulo="Quadras hoje"
      acao={<LinkDoCartao href="/horarios">Ver a grade</LinkDoCartao>}
    />
  );
  if (!resposta.ok) {
    return (
      <Cartao aria-labelledby="titulo-quadras-hoje" className="flex flex-col gap-5">
        {cabecalho}
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      </Cartao>
    );
  }
  const { reservadas, abertas } = ocupacaoDoDia(resposta.dados);
  const fracao = abertas > 0 ? reservadas / abertas : 0;
  const reservas = reservasDoDia(resposta.dados);
  const proximas = proximasReservas(reservas, minutoAtual);
  const mapa = mapaDoDia(resposta.dados);
  return (
    <Cartao aria-labelledby="titulo-quadras-hoje" className="flex flex-col gap-5">
      {cabecalho}
      <div className="flex items-center gap-4">
        <Anel
          fracao={fracao}
          tom="areia"
          tamanho={80}
          espessura={9}
          rotulo={`${reservadas} de ${abertas} horas reservadas`}
        >
          <span className="text-base font-extrabold tabular-nums">{Math.round(fracao * 100)}%</span>
        </Anel>
        <div className="flex flex-col gap-1">
          <p className="text-suave text-sm">
            <span className="text-texto text-2xl font-extrabold tabular-nums">{reservadas}</span> de{" "}
            {abertas} horas reservadas
          </p>
          <p className="text-apagado text-xs">
            {reservas.length === 0
              ? "Nenhuma reserva para hoje."
              : `${reservas.length} ${reservas.length === 1 ? "reserva" : "reservas"} nas ${resposta.dados.quadras.length} quadras`}
          </p>
        </div>
      </div>
      {mapa && <MapaDasQuadras mapa={mapa} minutoAtual={minutoAtual} />}
      {reservas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-apagado text-[0.7rem] font-bold tracking-[0.16em] uppercase">
            Próximas
          </h3>
          {proximas.length === 0 ? (
            <p className="text-apagado text-sm">As reservas de hoje já terminaram.</p>
          ) : (
            <ul className="flex flex-col gap-1" aria-label="Reservas de hoje">
              {proximas.slice(0, 3).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/horarios/reservas/${r.id}`}
                    className="hover:bg-elevado/60 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors"
                  >
                    <span className="bg-areia/12 text-areia shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-bold whitespace-nowrap tabular-nums">
                      {faixaDeHoras(r.horaInicio, r.horaFim)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.clienteNome}</span>
                      <span className="text-apagado block text-xs">{r.quadra}</span>
                    </span>
                    <Selo tom={r.pago ? "sucesso" : "ouro"}>{r.pago ? "Pago" : "A pagar"}</Selo>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {proximas.length > 3 && (
            <p className="text-apagado text-xs">E mais {proximas.length - 3} reservas.</p>
          )}
        </div>
      )}
      {!mapa && <Vazio compacto titulo="Sem horário de funcionamento hoje." />}
    </Cartao>
  );
}

const QUARTOS = ["left-0", "left-1/4", "left-1/2", "left-3/4"] as const;

/**
 * Mapa do dia: cada quadra é uma faixa das horas de funcionamento; reserva paga em
 * roxo, a pagar em dourado, bloqueio riscado. A linha dourada marca a hora atual.
 */
function MapaDasQuadras({ mapa, minutoAtual }: { mapa: MapaDoDia; minutoAtual: number }) {
  const horas = mapa.fim - mapa.inicio;
  const colunas = `grid-cols-${horas}`;
  const horaAgora = minutoAtual / 60;
  const agoraNoMapa = horaAgora >= mapa.inicio && horaAgora < mapa.fim;
  const passo = horas > 12 ? 4 : horas > 6 ? 2 : 1;
  const marcas = Array.from({ length: horas }, (_, i) => mapa.inicio + i).filter(
    (h) => (h - mapa.inicio) % passo === 0,
  );
  const descricao = mapa.quadras
    .map(
      (q) =>
        `${q.nome}: ${
          q.blocos.length === 0
            ? "livre o dia todo"
            : q.blocos
                .map((b) => `${faixaDeHoras(b.inicio, b.fim)} ${b.tipo === "RESERVA" ? b.rotulo : "bloqueado"}`)
                .join(", ")
        }`,
    )
    .join(". ");

  return (
    <div role="img" aria-label={`Mapa do dia. ${descricao}.`} className="flex flex-col gap-2">
      {mapa.quadras.map((q, linha) => (
        <div key={q.id} className="flex items-center gap-3">
          <span className="text-apagado w-6 shrink-0 text-xs font-bold" aria-hidden="true">
            Q{linha + 1}
          </span>
          <div className={`bg-elevado/50 relative grid h-7 flex-1 rounded-full ${colunas}`}>
            {q.blocos.map((b, i) => (
              <span
                key={b.id}
                title={`${faixaDeHoras(b.inicio, b.fim)} · ${b.rotulo}`}
                className={`col-start-${b.inicio - mapa.inicio + 1} col-span-${b.fim - b.inicio} row-start-1 m-0.5 origin-left animate-crescer-x rounded-full atraso-${Math.min(24, linha * 3 + i + 2)} ${
                  b.tipo === "BLOQUEIO"
                    ? "bg-[repeating-linear-gradient(135deg,rgb(157_150_187_/_0.35)_0_3px,transparent_3px_7px)] ring-1 ring-apagado/30"
                    : b.pago
                      ? "bg-linear-to-r from-[#8448f0] to-[#6d28d9] shadow-[0_0_14px_-4px_rgb(124_58_237_/_0.9)]"
                      : "bg-ouro/30 ring-1 ring-ouro/60"
                }`}
              />
            ))}
            {agoraNoMapa && (
              <span
                className={`col-start-${Math.floor(horaAgora) - mapa.inicio + 1} row-start-1 relative`}
                aria-hidden="true"
              >
                <span
                  className={`bg-ouro absolute -top-1 -bottom-1 w-0.5 rounded-full shadow-[0_0_8px_rgb(233_171_2_/_0.9)] ${QUARTOS[Math.min(3, Math.floor((minutoAtual % 60) / 15))]}`}
                />
              </span>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="w-6 shrink-0" />
        <div className={`grid flex-1 ${colunas}`}>
          {marcas.map((h) => (
            <span
              key={h}
              className={`text-apagado col-start-${h - mapa.inicio + 1} row-start-1 text-[0.65rem] font-semibold tabular-nums ${h === mapa.inicio ? "" : "-translate-x-1/2"}`}
            >
              {h}h
            </span>
          ))}
        </div>
      </div>
      <ul className="text-apagado flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-hidden="true">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#7c3aed]" /> Pago
        </li>
        <li className="flex items-center gap-1.5">
          <span className="bg-ouro/40 ring-ouro/60 size-2.5 rounded-full ring-1" /> A pagar
        </li>
        <li className="flex items-center gap-1.5">
          <span className="bg-apagado/40 size-2.5 rounded-full" /> Bloqueado
        </li>
        {agoraNoMapa && (
          <li className="flex items-center gap-1.5">
            <span className="bg-ouro h-2.5 w-0.5 rounded-full" /> Agora
          </li>
        )}
      </ul>
    </div>
  );
}
