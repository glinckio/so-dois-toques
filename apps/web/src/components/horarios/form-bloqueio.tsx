"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { bloquear } from "@/app/acoes/horarios";
import { BotaoEnviar } from "@/components/base/enviar";
import { OpcoesEmBlocos } from "@/components/base/opcoes";
import { Selo } from "@/components/base/selo";
import { Icone, type NomeIcone } from "@/components/icones";
import { Aviso, Campo, classeBotao, classeCampo, classeRotulo } from "@/components/ui";
import { DIAS_SEMANA, formatarData } from "@/lib/aulas/formatacao";
import {
  faixaDeHoras,
  HORAS_DE_FIM,
  HORAS_DE_INICIO,
  rotuloHora,
  SEMANAS_MAXIMAS,
  semanasDaSerie,
} from "@/lib/horarios/formatacao";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

type Escolha = {
  repeticao: string;
  data: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  motivo: string;
};

function lerEscolha(form: HTMLFormElement): Escolha {
  const dados = new FormData(form);
  const campo = (nome: string) => String(dados.get(nome) ?? "");
  return {
    repeticao: campo("repeticao") || "AVULSO",
    data: campo("data"),
    dataFim: campo("dataFim"),
    horaInicio: campo("horaInicio"),
    horaFim: campo("horaFim"),
    motivo: campo("motivo"),
  };
}

/**
 * FOCO-CA-06: bloqueio da quadra (manutenção, evento), só num dia ou toda semana. O
 * resumo ao lado acompanha a escolha; quem confere aulas e outros bloqueios é a API.
 */
export function FormBloqueio({
  hoje,
  inicial,
}: {
  hoje: string;
  inicial: { data: string; horaInicio: string };
}) {
  const [estado, acao, enviando] = useActionState(bloquear, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  const horaFimPadrao = inicial.horaInicio ? String(Number(inicial.horaInicio) + 1) : "";
  const [escolha, setEscolha] = useState<Escolha>(() => ({
    repeticao: valor("repeticao", "AVULSO"),
    data: valor("data", inicial.data),
    dataFim: valor("dataFim"),
    horaInicio: valor("horaInicio", inicial.horaInicio),
    horaFim: valor("horaFim", horaFimPadrao),
    motivo: valor("motivo"),
  }));
  const semanal = escolha.repeticao === "SEMANAL";

  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      onChange={(evento) => setEscolha(lerEscolha(evento.currentTarget))}
      aria-label="Bloquear horário"
      className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]"
    >
      <div className="superficie flex flex-col gap-7 rounded-[1.75rem] p-5 sm:p-6">
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        <OpcoesEmBlocos
          nome="repeticao"
          legenda="Repetição"
          padrao={valor("repeticao", "AVULSO")}
          colunas="grid-cols-1 sm:grid-cols-2"
          opcoes={[
            { valor: "AVULSO", rotulo: "Só neste dia", icone: "calendario" },
            { valor: "SEMANAL", rotulo: "Toda semana", icone: "repetir" },
          ]}
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
                rotulo={`Último dia (até ${SEMANAS_MAXIMAS} semanas)`}
                id="dataFim"
                type="date"
                icone="calendario"
                required
                min={hoje}
                defaultValue={valor("dataFim")}
              />
            )}
            <SeletorDeHora
              id="horaInicio"
              rotulo="Das"
              horas={HORAS_DE_INICIO}
              padrao={valor("horaInicio", inicial.horaInicio)}
            />
            <SeletorDeHora
              id="horaFim"
              rotulo="Até"
              horas={HORAS_DE_FIM}
              padrao={valor("horaFim", horaFimPadrao)}
            />
          </div>
        </fieldset>
        <Campo
          rotulo="Motivo do bloqueio"
          id="motivo"
          icone="bloqueio"
          required
          minLength={3}
          maxLength={200}
          placeholder="Manutenção da areia"
          defaultValue={valor("motivo")}
        />
      </div>

      <ResumoDoBloqueio escolha={escolha} semanal={semanal} enviando={enviando} />
    </form>
  );
}

function SeletorDeHora({
  id,
  rotulo,
  horas,
  padrao,
}: {
  id: string;
  rotulo: string;
  horas: readonly number[];
  padrao: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={classeRotulo}>
        {rotulo}
      </label>
      <div className="relative">
        <Icone
          nome="relogio"
          width={18}
          height={18}
          className="text-apagado pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
        />
        <select id={id} name={id} required className={`${classeCampo} pl-11`} defaultValue={padrao}>
          <option value="">Escolha</option>
          {horas.map((h) => (
            <option key={h} value={h}>
              {rotuloHora(h)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** O bloqueio que vai ser criado, com o botão de enviar. */
function ResumoDoBloqueio({
  escolha,
  semanal,
  enviando,
}: {
  escolha: Escolha;
  semanal: boolean;
  enviando: boolean;
}) {
  const diaValido = DATA.test(escolha.data);
  const inicio = escolha.horaInicio === "" ? Number.NaN : Number(escolha.horaInicio);
  const fim = escolha.horaFim === "" ? Number.NaN : Number(escolha.horaFim);
  const horario = Number.isInteger(inicio) && Number.isInteger(fim) && fim > inicio;
  const semanas = semanal ? semanasDaSerie(escolha.data, escolha.dataFim) : 1;
  return (
    <div className="superficie-destaque flex flex-col gap-4 rounded-[1.75rem] p-5 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-roxo-claro text-[0.7rem] font-bold tracking-[0.16em] uppercase">
          Seu bloqueio
        </span>
        <Selo tom={semanal ? "roxo" : "areia"}>{semanal ? "Toda semana" : "Só um dia"}</Selo>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        <ItemDoResumo icone="calendario" vazio={!diaValido}>
          {diaValido
            ? `${DIAS_SEMANA[new Date(`${escolha.data}T12:00:00Z`).getUTCDay()]}, ${formatarData(escolha.data)}`
            : "Escolha o dia"}
          {semanal && DATA.test(escolha.dataFim) && (
            <span className="text-suave block text-xs font-medium">
              toda semana até {formatarData(escolha.dataFim)} ({semanas}{" "}
              {semanas === 1 ? "data" : "datas"})
            </span>
          )}
        </ItemDoResumo>
        <ItemDoResumo icone="relogio" vazio={!horario}>
          {horario ? faixaDeHoras(inicio, fim) : "Escolha o horário"}
        </ItemDoResumo>
        <ItemDoResumo icone="bloqueio" vazio={escolha.motivo.trim().length < 3}>
          {escolha.motivo.trim() || "Escreva o motivo"}
        </ItemDoResumo>
      </ul>
      {semanal && semanas > SEMANAS_MAXIMAS && (
        <Aviso tipo="erro">O bloqueio semanal vai até {SEMANAS_MAXIMAS} semanas.</Aviso>
      )}
      <BotaoEnviar enviando={enviando} className={classeBotao}>
        Bloquear horário
      </BotaoEnviar>
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
      <span className="bg-noite/40 text-areia grid size-8 shrink-0 place-items-center rounded-xl">
        <Icone nome={icone} width={16} height={16} />
      </span>
      <span className={`pt-1 font-semibold ${vazio ? "text-apagado" : ""}`}>{children}</span>
    </li>
  );
}
