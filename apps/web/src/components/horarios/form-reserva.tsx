"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { criarReserva } from "@/app/acoes/horarios";
import { BotaoEnviar } from "@/components/base/enviar";
import { OpcoesEmBlocos } from "@/components/base/opcoes";
import { Selo } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Icone, type NomeIcone } from "@/components/icones";
import { Aviso, Campo, classeBotao, classeCampo, classeRotulo } from "@/components/ui";
import { DIAS_SEMANA, formatarData } from "@/lib/aulas/formatacao";
import { DURACAO_MAXIMA, faixaDeHoras, HORAS, rotuloHora } from "@/lib/horarios/formatacao";
import { previaDoValor, SEMANAS_MAXIMAS, semanasDaSerie } from "@/lib/horarios/previa";
import type { Faixa, Quadra } from "@/lib/horarios/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { Ingresso } from "./ingresso";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

type Escolha = {
  tipo: string;
  repeticao: string;
  quadraId: string;
  data: string;
  dataFim: string;
  horaInicio: string;
  duracao: string;
};

function lerEscolha(form: HTMLFormElement): Escolha {
  const dados = new FormData(form);
  const campo = (nome: string) => String(dados.get(nome) ?? "");
  return {
    tipo: campo("tipo") || "RESERVA",
    repeticao: campo("repeticao") || "AVULSA",
    quadraId: campo("quadraId"),
    data: campo("data"),
    dataFim: campo("dataFim"),
    horaInicio: campo("horaInicio"),
    duracao: campo("duracao") || "1",
  };
}

/**
 * HOR-CA-03, 05 e 06: reserva de cliente ou bloqueio, avulso ou toda semana. A quadra,
 * a duração e a repetição são escolhidas em blocos, e o resumo ao lado acompanha a
 * escolha com a prévia do valor (quem decide o valor é a API).
 */
export function FormReserva({
  quadras,
  faixas,
  hoje,
  admin,
  inicial,
}: {
  quadras: Quadra[];
  /** Faixas de preço da semana, para a prévia do valor (null se não carregaram). */
  faixas: Faixa[] | null;
  hoje: string;
  admin: boolean;
  inicial: { data: string; quadraId: string; horaInicio: string };
}) {
  const [estado, acao, enviando] = useActionState(criarReserva, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  const [escolha, setEscolha] = useState<Escolha>(() => ({
    tipo: valor("tipo", "RESERVA"),
    repeticao: valor("repeticao", "AVULSA"),
    quadraId: valor("quadraId", inicial.quadraId),
    data: valor("data", inicial.data),
    dataFim: valor("dataFim"),
    horaInicio: valor("horaInicio", inicial.horaInicio),
    duracao: valor("duracao", "1"),
  }));
  const semanal = escolha.repeticao === "SEMANAL";
  const bloqueio = admin && escolha.tipo === "BLOQUEIO";
  const hora = escolha.horaInicio === "" ? Number.NaN : Number(escolha.horaInicio);
  const diaSemana = DATA.test(escolha.data)
    ? new Date(`${escolha.data}T12:00:00Z`).getUTCDay()
    : Number.NaN;
  const abertas =
    faixas && !Number.isNaN(diaSemana) ? faixas.filter((f) => f.diaSemana === diaSemana) : null;

  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      onChange={(evento) => setEscolha(lerEscolha(evento.currentTarget))}
      aria-label="Nova reserva"
      className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]"
    >
      <div className="superficie flex flex-col gap-7 rounded-[1.75rem] p-5 sm:p-6">
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {admin && (
          <OpcoesEmBlocos
            nome="tipo"
            legenda="O que é"
            padrao={valor("tipo", "RESERVA")}
            colunas="grid-cols-1 sm:grid-cols-2"
            opcoes={[
              { valor: "RESERVA", rotulo: "Reserva de cliente", icone: "pessoa" },
              { valor: "BLOQUEIO", rotulo: "Bloqueio (aula, manutenção)", icone: "bloqueio" },
            ]}
          />
        )}
        <OpcoesEmBlocos
          nome="quadraId"
          legenda="Quadra"
          padrao={valor("quadraId", inicial.quadraId)}
          colunas="grid-cols-1 sm:grid-cols-2"
          opcoes={quadras.map((q) => ({
            valor: q.id,
            rotulo: q.nome,
            icone: "areia" as NomeIcone,
          }))}
        />
        <fieldset className="flex flex-col gap-3">
          <legend className="text-suave mb-1.5 text-sm font-medium">Quando</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              rotulo={semanal ? "Primeiro dia" : "Dia"}
              id="data"
              type="date"
              icone="calendario"
              required
              min={hoje}
              defaultValue={valor("data", inicial.data)}
            />
            {semanal && (
              <Campo
                rotulo="Último dia (até 26 semanas)"
                id="dataFim"
                type="date"
                icone="calendario"
                required
                min={hoje}
                defaultValue={valor("dataFim")}
              />
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="horaInicio" className={classeRotulo}>
                Início
              </label>
              <div className="relative">
                <Icone
                  nome="relogio"
                  width={18}
                  height={18}
                  className="text-apagado pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
                />
                <select
                  id="horaInicio"
                  name="horaInicio"
                  required
                  className={`${classeCampo} pl-11`}
                  defaultValue={valor("horaInicio", inicial.horaInicio)}
                >
                  <option value="">Escolha</option>
                  {HORAS.map((h) => {
                    const fechada =
                      abertas !== null && !abertas.some((f) => f.horaInicio <= h && h < f.horaFim);
                    return (
                      <option key={h} value={h}>
                        {rotuloHora(h)}
                        {fechada ? " · fechado" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </fieldset>
        <OpcoesEmBlocos
          nome="duracao"
          legenda="Duração"
          padrao={valor("duracao", "1")}
          opcoes={Array.from({ length: DURACAO_MAXIMA }, (_, i) => i + 1).map((d) => ({
            valor: String(d),
            rotulo: `${d} ${d === 1 ? "hora" : "horas"}`,
            detalhe:
              Number.isInteger(hora) && hora + d <= 24 ? `até ${rotuloHora(hora + d)}` : undefined,
          }))}
        />
        <OpcoesEmBlocos
          nome="repeticao"
          legenda="Repetição"
          padrao={valor("repeticao", "AVULSA")}
          colunas="grid-cols-1 sm:grid-cols-2"
          opcoes={[
            { valor: "AVULSA", rotulo: "Só neste dia", icone: "calendario" },
            { valor: "SEMANAL", rotulo: "Toda semana (fixa)", icone: "repetir" },
          ]}
        />
        {bloqueio ? (
          <Campo
            rotulo="Motivo do bloqueio"
            id="motivo"
            icone="bloqueio"
            required
            minLength={3}
            maxLength={200}
            placeholder="Aula turma iniciante"
            defaultValue={valor("motivo")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Nome do cliente"
              id="clienteNome"
              icone="pessoa"
              required
              minLength={2}
              maxLength={80}
              autoComplete="off"
              defaultValue={valor("clienteNome")}
            />
            <Campo
              rotulo="Telefone (opcional)"
              id="clienteTelefone"
              icone="telefone"
              type="tel"
              inputMode="tel"
              placeholder="(21) 99999-9999"
              defaultValue={valor("clienteTelefone")}
            />
          </div>
        )}
      </div>

      <ResumoDaReserva
        escolha={escolha}
        quadras={quadras}
        faixas={faixas}
        hora={hora}
        bloqueio={bloqueio}
        semanal={semanal}
        enviando={enviando}
      />
    </form>
  );
}

/** O ingresso que vai sair: quadra, dia, horário e a prévia do valor, com o botão de enviar. */
function ResumoDaReserva({
  escolha,
  quadras,
  faixas,
  hora,
  bloqueio,
  semanal,
  enviando,
}: {
  escolha: Escolha;
  quadras: Quadra[];
  faixas: Faixa[] | null;
  hora: number;
  bloqueio: boolean;
  semanal: boolean;
  enviando: boolean;
}) {
  const quadra = quadras.find((q) => q.id === escolha.quadraId);
  const duracao = Number(escolha.duracao);
  const diaValido = DATA.test(escolha.data);
  const previa = faixas ? previaDoValor(faixas, escolha.data, hora, duracao) : null;
  const semanas = semanal ? semanasDaSerie(escolha.data, escolha.dataFim) : 1;
  const total = previa?.totalCentavos ?? null;
  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-6">
      <Ingresso
        topo={
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-roxo-claro text-[0.7rem] font-bold tracking-[0.16em] uppercase">
                {bloqueio ? "Seu bloqueio" : "Sua reserva"}
              </span>
              <Selo tom={semanal ? "roxo" : "areia"}>{semanal ? "Toda semana" : "Avulsa"}</Selo>
            </div>
            <ul className="flex flex-col gap-3 text-sm">
              <ItemDoResumo icone="areia" vazio={!quadra}>
                {quadra?.nome ?? "Escolha a quadra"}
              </ItemDoResumo>
              <ItemDoResumo icone="calendario" vazio={!diaValido}>
                {diaValido
                  ? `${DIAS_SEMANA[new Date(`${escolha.data}T12:00:00Z`).getUTCDay()]}, ${formatarData(escolha.data)}`
                  : "Escolha o dia"}
                {semanal && DATA.test(escolha.dataFim) && (
                  <span className="text-suave block text-xs font-medium">
                    toda semana até {formatarData(escolha.dataFim)}
                  </span>
                )}
              </ItemDoResumo>
              <ItemDoResumo icone="relogio" vazio={!Number.isInteger(hora)}>
                {Number.isInteger(hora) ? faixaDeHoras(hora, hora + duracao) : "Escolha a hora"}
              </ItemDoResumo>
            </ul>
            {previa && !bloqueio && (
              <ul aria-label="Preço de cada hora" className="flex flex-wrap gap-1.5">
                {previa.horas.map((h) => (
                  <li
                    key={h.hora}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                      h.valorCentavos === null
                        ? "bg-perigo/15 text-perigo"
                        : "bg-noite/40 text-suave border border-white/10"
                    }`}
                  >
                    {h.hora}h ·{" "}
                    {h.valorCentavos === null ? "fechado" : formatarReais(h.valorCentavos)}
                  </li>
                ))}
              </ul>
            )}
          </>
        }
        canhoto={
          <>
            <div aria-live="polite" className="flex flex-col gap-1">
              {bloqueio ? (
                <p className="text-suave text-sm">
                  Bloqueio não tem valor: o horário só fica fechado para reservas.
                </p>
              ) : total !== null ? (
                <>
                  <span className="text-apagado text-[0.7rem] font-bold tracking-[0.16em] uppercase">
                    {semanal ? "Valor por semana" : "Valor"}
                  </span>
                  <Valor
                    key={total}
                    centavos={total}
                    className="animate-surgir text-3xl font-extrabold"
                  />
                  {semanal && semanas > 0 && (
                    <span className="text-suave text-sm">
                      {semanas} {semanas === 1 ? "semana" : "semanas"} ·{" "}
                      {formatarReais(total * semanas)} ao todo
                    </span>
                  )}
                </>
              ) : previa ? (
                <p className="text-perigo flex items-start gap-2 text-sm font-semibold">
                  <Icone nome="alerta" width={16} height={16} className="mt-0.5 shrink-0" />
                  Fora do horário de funcionamento neste dia.
                </p>
              ) : (
                <p className="text-suave text-sm">
                  A prévia do valor aparece quando o dia e a hora estiverem escolhidos.
                </p>
              )}
              {semanal && semanas > SEMANAS_MAXIMAS && (
                <p className="text-perigo text-sm font-semibold">
                  A reserva fixa vai até {SEMANAS_MAXIMAS} semanas.
                </p>
              )}
            </div>
            <BotaoEnviar
              enviando={enviando}
              textoEnviando="Salvando..."
              className={`${classeBotao} w-full`}
              icone={<Icone nome={bloqueio ? "bloqueio" : "check"} width={18} height={18} />}
            >
              {bloqueio ? "Bloquear horário" : "Reservar"}
            </BotaoEnviar>
          </>
        }
      />
      <p className="text-apagado px-2 text-xs">
        O valor é calculado pelos preços de cada hora e aparece na reserva.
      </p>
    </div>
  );
}

function ItemDoResumo({
  icone,
  vazio,
  children,
}: {
  icone: NomeIcone;
  vazio: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="bg-noite/40 text-roxo-claro grid size-8 shrink-0 place-items-center rounded-xl border border-white/10">
        <Icone nome={icone} width={16} height={16} />
      </span>
      <span className={`min-w-0 self-center font-semibold ${vazio ? "text-apagado" : ""}`}>
        {children}
      </span>
    </li>
  );
}
