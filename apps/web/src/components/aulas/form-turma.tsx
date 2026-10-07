"use client";

import { useActionState, useState } from "react";
import { salvarTurma } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import {
  Aviso,
  Campo,
  classeBotaoIcone,
  classeBotaoSecundario,
  classeCampo,
  classeRotulo,
} from "@/components/ui";
import {
  DIAS_SEMANA,
  descreverHorarios,
  horaDe,
  minutosDe,
  NIVEIS,
  type Horario,
  type Nivel,
} from "@/lib/aulas/formatacao";
import type { Local, Professor, TurmaResumo } from "@/lib/aulas/tipos";
import { GrupoDoFormulario } from "./grupo-do-formulario";
import { SemanaDaTurma } from "./horarios";
import { SinalDoNivel } from "./selo-nivel";

type Linha = { chave: number; diaSemana: number; inicio: string; fim: string };

let proximaChave = 0;
const linha = (h: Partial<Horario> = {}): Linha => ({
  chave: proximaChave++,
  diaSemana: h.diaSemana ?? 1,
  inicio: h.inicio !== undefined ? horaDe(h.inicio) : "07:00",
  fim: h.fim !== undefined ? horaDe(h.fim) : "08:00",
});

const DICAS_DO_NIVEL: Record<Nivel, string> = {
  INICIANTE: "Primeiros toques",
  INTERMEDIARIO: "Já joga em rede",
  AVANCADO: "Jogo e tática",
};

export function FormTurma({
  turma,
  locais,
  professores,
}: {
  turma?: TurmaResumo;
  locais: Local[];
  professores: Professor[];
}) {
  const [estado, acao, enviando] = useActionState(salvarTurma, ESTADO_INICIAL);
  // Depois de um erro, os campos voltam ao que foi digitado, não à turma salva.
  const valor = (campo: string, salvo?: string | number) =>
    estado.valores?.[campo] ?? (salvo === undefined ? "" : String(salvo));
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    turma
      ? turma.horarios.map((h) => linha(h))
      : [linha({ diaSemana: 1 }), linha({ diaSemana: 3 })],
  );
  const horarios = linhas.map((l) => ({
    diaSemana: l.diaSemana,
    inicio: minutosDe(l.inicio) ?? -1,
    fim: minutosDe(l.fim) ?? -1,
  }));
  const validos = horarios.filter((h) => h.inicio >= 0 && h.fim > h.inicio);
  // Local inativo só aparece se for o atual da turma (AULAS-CA-09).
  const opcoesLocal = locais.filter((l) => l.ativo || l.id === turma?.local.id);
  const atualizar = (chave: number, mudanca: Partial<Linha>) =>
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  const nivelEscolhido = valor("nivel", turma?.nivel ?? "INICIANTE");

  return (
    <form
      // Remonta o formulário quando os valores devolvidos mudam: o React não atualiza o
      // valor inicial de um <select> depois de montado.
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      className="flex flex-col gap-4"
    >
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {turma && <input type="hidden" name="id" value={turma.id} />}
      <input type="hidden" name="horarios" value={JSON.stringify(horarios)} />

      <GrupoDoFormulario legenda="A turma" icone="aulas">
        <div className="sm:col-span-2">
          <Campo
            rotulo="Nome da turma"
            id="nome"
            required
            minLength={2}
            maxLength={80}
            placeholder="Iniciantes da manhã"
            defaultValue={valor("nome", turma?.nome)}
          />
        </div>
        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="text-suave mb-1.5 text-sm font-medium">Nível</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(NIVEIS) as Nivel[]).map((n) => (
              <label
                key={n}
                htmlFor={`nivel-${n}`}
                className="group border-borda bg-elevado/40 has-checked:border-roxo has-checked:bg-roxo-forte/20 has-focus-visible:outline-ouro relative flex min-h-16 cursor-pointer flex-col items-start gap-1.5 rounded-2xl border px-3.5 py-3 transition duration-200 hover:border-[#3a2f6b] active:scale-[0.98] has-checked:shadow-[0_10px_30px_-16px_rgb(166_103_252_/_0.9)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
              >
                <input
                  id={`nivel-${n}`}
                  type="radio"
                  name="nivel"
                  value={n}
                  defaultChecked={nivelEscolhido === n}
                  className="sr-only"
                />
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-bold sm:text-base">{NIVEIS[n]}</span>
                  <SinalDoNivel nivel={n} />
                </span>
                <span className="text-apagado text-xs max-sm:hidden">{DICAS_DO_NIVEL[n]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="localId" className={classeRotulo}>
            Local
          </label>
          <select
            id="localId"
            name="localId"
            className={classeCampo}
            required
            defaultValue={valor("localId", turma?.local.id)}
          >
            <option value="" disabled>
              Escolha
            </option>
            {opcoesLocal.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="professorId" className={classeRotulo}>
            Professor
          </label>
          <select
            id="professorId"
            name="professorId"
            className={classeCampo}
            required
            defaultValue={valor("professorId", turma?.professor.id)}
          >
            <option value="" disabled>
              Escolha
            </option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo="Vagas"
          id="vagas"
          icone="usuarios"
          type="number"
          min={1}
          max={40}
          required
          defaultValue={valor("vagas", turma?.vagas ?? 10)}
        />
      </GrupoDoFormulario>

      <GrupoDoFormulario
        legenda="Dias e horários"
        icone="relogio"
        tom="ouro"
        dica="Um dia por linha; dias com o mesmo horário aparecem juntos."
        colunas=""
      >
        <ol className="flex flex-col gap-2">
          {linhas.map((l, i) => {
            const inicio = minutosDe(l.inicio);
            const fim = minutosDe(l.fim);
            const invertido = inicio !== null && fim !== null && fim <= inicio;
            return (
              <li
                key={l.chave}
                className="bg-elevado/35 border-borda animate-surgir flex flex-col gap-2 rounded-2xl border p-3"
              >
                <div className="grid grid-cols-2 items-end gap-2 sm:flex">
                  <label className={`${classeRotulo} col-span-2 flex flex-col gap-1.5 sm:flex-1`}>
                    Dia {i + 1}
                    <select
                      className={classeCampo}
                      value={l.diaSemana}
                      onChange={(e) => atualizar(l.chave, { diaSemana: Number(e.target.value) })}
                    >
                      {DIAS_SEMANA.map((nome, dia) => (
                        <option key={dia} value={dia}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={`${classeRotulo} flex flex-col gap-1.5`}>
                    Início
                    <input
                      type="time"
                      className={classeCampo}
                      value={l.inicio}
                      onChange={(e) => atualizar(l.chave, { inicio: e.target.value })}
                      required
                    />
                  </label>
                  <label className={`${classeRotulo} flex flex-col gap-1.5`}>
                    Fim
                    <input
                      type="time"
                      className={classeCampo}
                      value={l.fim}
                      onChange={(e) => atualizar(l.chave, { fim: e.target.value })}
                      required
                    />
                  </label>
                  {linhas.length > 1 && (
                    <button
                      type="button"
                      className={`${classeBotaoIcone} hover:border-perigo/50 hover:text-perigo col-span-2 justify-self-end sm:mb-0.5`}
                      onClick={() =>
                        setLinhas((atuais) => atuais.filter((x) => x.chave !== l.chave))
                      }
                    >
                      <Icone nome="lixeira" width={18} height={18} />
                      <span className="sr-only">Remover este horário</span>
                    </button>
                  )}
                </div>
                {invertido && (
                  <p className="text-ouro flex items-center gap-1.5 text-xs font-semibold">
                    <Icone nome="alerta" width={14} height={14} />O fim precisa ser depois do
                    início.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className={classeBotaoSecundario}
            onClick={() => setLinhas((atuais) => [...atuais, linha()])}
          >
            <Icone nome="mais" width={18} height={18} />
            Adicionar dia
          </button>
          <div className="flex flex-col items-end gap-1.5">
            <SemanaDaTurma horarios={validos} />
            <p className="text-apagado text-right text-xs" aria-live="polite">
              {validos.length > 0 ? descreverHorarios(validos) : "Nenhum horário completo ainda."}
            </p>
          </div>
        </div>
      </GrupoDoFormulario>

      <div>
        <BotaoEnviar
          enviando={enviando}
          textoEnviando="Salvando..."
          icone={<Icone nome="check" width={18} height={18} strokeWidth={2.4} />}
        >
          Salvar turma
        </BotaoEnviar>
      </div>
    </form>
  );
}
