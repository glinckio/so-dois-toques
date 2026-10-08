import Link from "next/link";
import { PontoVivo, Selo } from "@/components/base/selo";
import { Icone } from "@/components/icones";
import type { Agenda, BlocoDaAgenda, LivreDaAgenda } from "@/lib/horarios/agenda";
import { faixaDeHoras, rotuloHora } from "@/lib/horarios/formatacao";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { FILETE_DA_SITUACAO, FUNDO_DA_SITUACAO } from "./estilos";

/** Coluna das horas mais uma coluna por quadra (escritas por inteiro para o Tailwind). */
const COLUNAS = [
  "grid-cols-[3rem_repeat(1,minmax(8rem,1fr))]",
  "grid-cols-[3rem_repeat(2,minmax(8rem,1fr))]",
  "grid-cols-[3rem_repeat(3,minmax(8rem,1fr))]",
  "grid-cols-[3rem_repeat(4,minmax(8rem,1fr))]",
  "grid-cols-[3rem_repeat(5,minmax(8rem,1fr))]",
  "grid-cols-[3rem_repeat(6,minmax(8rem,1fr))]",
  "grid-cols-[3rem_repeat(7,minmax(8rem,1fr))]",
  "grid-cols-[3rem_repeat(8,minmax(8rem,1fr))]",
] as const;

/** Altura da linha do agora dentro da hora, de 15 em 15 minutos. */
const QUARTOS = ["top-0", "top-1/4", "top-1/2", "top-3/4"] as const;

/**
 * VIVO-CA-06: a grade do dia como agenda de blocos. Cada quadra é uma coluna com o
 * cabeçalho na cor da areia, cada hora é uma linha; uma reserva é um único bloco que
 * ocupa todas as suas horas (CSS grid com `row-start`/`row-span`). Para o leitor de
 * tela, é uma tabela: o bloco é uma célula que abrange várias linhas (`aria-rowspan`).
 */
export function AgendaDasQuadras({ agenda, data }: { agenda: Agenda; data: string }) {
  const colunas = COLUNAS[Math.min(agenda.colunas.length, COLUNAS.length) - 1] ?? COLUNAS[0];
  const aindaAberto = agenda.horas.some((h) => !h.passou);
  return (
    <div className="-mx-1 [scrollbar-width:thin] overflow-x-auto px-1 pb-1">
      <div
        role="table"
        aria-label="Grade do dia"
        aria-rowcount={agenda.horas.length + 1}
        aria-colcount={agenda.colunas.length + 1}
        aria-describedby="legenda-da-grade"
      >
        <div role="rowgroup" className={`grid ${colunas}`}>
          <div role="row" className="contents">
            <div role="columnheader" className="text-apagado flex items-end justify-end p-1 pb-2">
              <Icone nome="relogio" width={16} height={16} />
              <span className="sr-only">Hora</span>
            </div>
            {agenda.colunas.map((coluna) => (
              <div key={coluna.id} role="columnheader" className="p-1">
                <span className="text-fundo to-areia relative flex items-center gap-2 overflow-hidden rounded-2xl bg-linear-to-b from-[#f4dfba] px-3 py-2.5 shadow-[0_10px_24px_-16px_rgb(232_201_154_/_0.9)]">
                  <Icone nome="areia" width={18} height={18} className="shrink-0 opacity-70" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold">{coluna.nome}</span>
                    {aindaAberto && (
                      <span className="block text-[0.7rem] font-semibold opacity-75">
                        {coluna.livres === 0
                          ? "Sem horário livre"
                          : `${coluna.livres} ${coluna.livres === 1 ? "horário livre" : "horários livres"}`}
                      </span>
                    )}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          role="rowgroup"
          className={`relative grid ${colunas} auto-rows-[3.75rem] bg-[repeating-linear-gradient(to_bottom,rgb(44_35_84_/_0.75)_0_1px,transparent_1px_3.75rem)]`}
        >
          {agenda.horas.map((h) => (
            <div key={h.hora} role="row" className="contents">
              <div
                role="rowheader"
                className={`row-start-${h.linha} col-start-1 pt-1.5 pr-2 text-right text-xs font-bold tabular-nums ${
                  h.agora ? "text-ouro" : h.passou ? "text-apagado/55" : "text-apagado"
                }`}
              >
                {rotuloHora(h.hora)}
                {h.agora && <span className="sr-only">, agora</span>}
              </div>
              {agenda.colunas.map((coluna) => {
                const item = coluna.itens.find((i) => i.linha === h.linha);
                if (!item) return null;
                return item.tipo === "livre" ? (
                  <CelulaLivre
                    key={coluna.id}
                    livre={item}
                    coluna={coluna.coluna}
                    quadra={coluna.nome}
                    quadraId={coluna.id}
                    data={data}
                  />
                ) : (
                  <BlocoDaReserva
                    key={coluna.id}
                    bloco={item}
                    coluna={coluna.coluna}
                    quadra={coluna.nome}
                  />
                );
              })}
            </div>
          ))}
          {agenda.agora && (
            <div
              aria-hidden="true"
              className={`row-start-${agenda.agora.linha} col-start-2 col-span-${agenda.colunas.length} pointer-events-none relative z-10`}
            >
              <span
                className={`bg-ouro absolute inset-x-1 h-0.5 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgb(233_171_2_/_0.9)] ${QUARTOS[agenda.agora.quarto]}`}
              />
              <span
                className={`animate-pulsar bg-ouro text-ouro absolute -left-1 size-2.5 -translate-y-1/2 rounded-full ${QUARTOS[agenda.agora.quarto]}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Horário livre: célula tracejada com "+ Reservar"; a hora que já começou fica apagada. */
function CelulaLivre({
  livre,
  coluna,
  quadra,
  quadraId,
  data,
}: {
  livre: LivreDaAgenda;
  coluna: number;
  quadra: string;
  quadraId: string;
  data: string;
}) {
  return (
    <div role="cell" className={`row-start-${livre.linha} col-start-${coluna} p-1`}>
      {livre.passou ? (
        <span className="border-borda/45 text-apagado/50 flex h-full items-center justify-center rounded-2xl border border-dashed text-xs">
          Livre
        </span>
      ) : (
        <Link
          href={`/horarios/nova?data=${data}&quadra=${quadraId}&hora=${livre.hora}`}
          aria-label={`Reservar ${quadra} às ${rotuloHora(livre.hora)}`}
          className="group border-borda text-apagado hover:border-roxo/60 hover:bg-roxo/10 hover:text-roxo-claro flex h-full items-center justify-center gap-1.5 rounded-2xl border border-dashed text-sm font-semibold transition duration-200 active:scale-[0.97]"
        >
          <Icone
            nome="mais"
            width={16}
            height={16}
            className="ease-mola transition-transform duration-300 group-hover:rotate-90"
          />
          Reservar
        </Link>
      )}
    </div>
  );
}

/** A reserva inteira num bloco só, colorido pela situação e sempre com o texto dela. */
function BlocoDaReserva({
  bloco,
  coluna,
  quadra,
}: {
  bloco: BlocoDaAgenda;
  coluna: number;
  quadra: string;
}) {
  const r = bloco.reserva;
  const bloqueio = bloco.situacao === "bloqueio";
  const fixa = r.serieId !== null && !bloqueio;
  const titulo = bloqueio ? `Bloqueado: ${r.motivo ?? ""}` : (r.clienteNome ?? "Cliente");
  const horario = faixaDeHoras(bloco.horaInicio, bloco.horaFim);
  const pagamento = r.pago ? "Pago" : "A pagar";
  const alto = bloco.linhas > 1;
  const rotulo = [
    titulo,
    quadra,
    horario,
    ...(bloqueio ? [] : [fixa ? `fixa, ${pagamento}` : pagamento, formatarReais(r.valorCentavos)]),
    ...(bloco.momento === "agora" ? ["em andamento"] : []),
  ].join(", ");
  return (
    <div
      role="cell"
      aria-rowspan={bloco.linhas}
      data-linhas={bloco.linhas}
      className={`row-start-${bloco.linha} row-span-${bloco.linhas} col-start-${coluna} animate-surgir relative min-h-0 p-1 atraso-${Math.min(24, bloco.linha + coluna)}`}
    >
      <Link
        href={`/horarios/reservas/${r.id}`}
        aria-label={rotulo}
        className={`@container relative flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-2xl border py-1.5 pr-2 pl-4 transition duration-200 hover:-translate-y-px hover:brightness-110 ${FUNDO_DA_SITUACAO[bloco.situacao]} ${
          bloco.momento === "agora"
            ? "ring-ouro/70 ring-2"
            : bloco.momento === "passou"
              ? "opacity-55 saturate-50"
              : ""
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-2 left-1.5 w-1 rounded-full ${FILETE_DA_SITUACAO[bloco.situacao]}`}
        />
        <span className="flex min-w-0 items-center gap-1.5">
          {(bloqueio || fixa) && (
            <Icone
              nome={bloqueio ? "bloqueio" : "repetir"}
              width={14}
              height={14}
              className={`shrink-0 ${bloqueio ? "text-suave" : "text-roxo-claro"}`}
            />
          )}
          <span
            className={`min-w-0 text-sm leading-5 font-semibold ${alto && bloqueio ? "line-clamp-2" : "truncate"}`}
          >
            {titulo}
          </span>
          {bloco.momento === "agora" && (
            <span className="ml-auto shrink-0">
              <PontoVivo tom="ouro" />
            </span>
          )}
        </span>
        {alto && <span className="text-suave text-xs tabular-nums">{horario}</span>}
        {!bloqueio && (
          <span className="mt-auto flex min-w-0 items-center gap-1.5">
            <Selo tom={r.pago ? "sucesso" : "ouro"} className="px-2 py-0.5 text-[0.65rem]">
              {pagamento}
            </Selo>
            {fixa && (
              <span className="text-roxo-claro text-[0.65rem] font-bold tracking-wide uppercase">
                Fixa
              </span>
            )}
            {alto && (
              // O valor só aparece quando o bloco tem largura para ele (consulta ao contêiner).
              <span
                className={`ml-auto hidden text-xs font-bold whitespace-nowrap tabular-nums ${
                  fixa ? "@min-[13rem]:inline" : "@min-[10.5rem]:inline"
                }`}
              >
                {formatarReais(r.valorCentavos)}
              </span>
            )}
          </span>
        )}
      </Link>
    </div>
  );
}
