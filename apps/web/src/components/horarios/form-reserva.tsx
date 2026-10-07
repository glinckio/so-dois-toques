"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { criarReserva } from "@/app/acoes/horarios";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { DURACAO_MAXIMA, HORAS, rotuloHora } from "@/lib/horarios/formatacao";
import type { Quadra } from "@/lib/horarios/tipos";

/** HOR-CA-03, 05 e 06: reserva de cliente ou bloqueio, avulso ou toda semana. */
export function FormReserva({
  quadras,
  hoje,
  admin,
  inicial,
}: {
  quadras: Quadra[];
  hoje: string;
  admin: boolean;
  inicial: { data: string; quadraId: string; horaInicio: string };
}) {
  const [estado, acao, enviando] = useActionState(criarReserva, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  const [tipo, setTipo] = useState(valor("tipo", "RESERVA"));
  const [repeticao, setRepeticao] = useState(valor("repeticao", "AVULSA"));
  const semanal = repeticao === "SEMANAL";
  const bloqueio = admin && tipo === "BLOQUEIO";
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Nova reserva"
      className="border-borda bg-cartao flex flex-col gap-4 rounded-2xl border p-4"
    >
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {admin && (
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-1 text-sm font-medium">O que é</legend>
          {[
            ["RESERVA", "Reserva de cliente"],
            ["BLOQUEIO", "Bloqueio (aula, manutenção)"],
          ].map(([v, rotulo]) => (
            <label key={v} className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                value={v}
                checked={tipo === v}
                onChange={() => setTipo(v as string)}
              />
              {rotulo}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-medium">Repetição</legend>
        {[
          ["AVULSA", "Só neste dia"],
          ["SEMANAL", "Toda semana (fixa)"],
        ].map(([v, rotulo]) => (
          <label key={v} className="flex items-center gap-2">
            <input
              type="radio"
              name="repeticao"
              value={v}
              checked={repeticao === v}
              onChange={() => setRepeticao(v as string)}
            />
            {rotulo}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="quadraId" className="text-sm font-medium">
            Quadra
          </label>
          <select
            id="quadraId"
            name="quadraId"
            required
            className={classeCampo}
            defaultValue={valor("quadraId", inicial.quadraId)}
          >
            {quadras.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome}
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo={semanal ? "Primeiro dia" : "Dia"}
          id="data"
          type="date"
          required
          min={hoje}
          defaultValue={valor("data", inicial.data)}
        />
        {semanal && (
          <Campo
            rotulo="Último dia (até 26 semanas)"
            id="dataFim"
            type="date"
            required
            min={hoje}
            defaultValue={valor("dataFim")}
          />
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="horaInicio" className="text-sm font-medium">
            Início
          </label>
          <select
            id="horaInicio"
            name="horaInicio"
            required
            className={classeCampo}
            defaultValue={valor("horaInicio", inicial.horaInicio)}
          >
            <option value="">Escolha</option>
            {HORAS.map((h) => (
              <option key={h} value={h}>
                {rotuloHora(h)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="duracao" className="text-sm font-medium">
            Duração
          </label>
          <select
            id="duracao"
            name="duracao"
            className={classeCampo}
            defaultValue={valor("duracao", "1")}
          >
            {Array.from({ length: DURACAO_MAXIMA }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? "hora" : "horas"}
              </option>
            ))}
          </select>
        </div>
        {bloqueio ? (
          <Campo
            rotulo="Motivo do bloqueio"
            id="motivo"
            required
            minLength={3}
            maxLength={200}
            placeholder="Aula turma iniciante"
            defaultValue={valor("motivo")}
          />
        ) : (
          <>
            <Campo
              rotulo="Nome do cliente"
              id="clienteNome"
              required
              minLength={2}
              maxLength={80}
              defaultValue={valor("clienteNome")}
            />
            <Campo
              rotulo="Telefone (opcional)"
              id="clienteTelefone"
              type="tel"
              inputMode="tel"
              placeholder="(21) 99999-9999"
              defaultValue={valor("clienteTelefone")}
            />
          </>
        )}
      </div>
      <p className="text-suave text-sm">
        O valor é calculado pelos preços de cada hora e aparece na reserva.
      </p>
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Salvando..." : bloqueio ? "Bloquear horário" : "Reservar"}
      </button>
    </form>
  );
}
