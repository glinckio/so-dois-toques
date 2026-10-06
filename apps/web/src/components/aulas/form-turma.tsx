"use client";

import { useActionState, useState } from "react";
import { salvarTurma } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotao, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { DIAS_SEMANA, horaDe, minutosDe, NIVEIS, type Horario } from "@/lib/aulas/formatacao";
import type { Local, Professor, TurmaResumo } from "@/lib/aulas/tipos";

type Linha = { chave: number; diaSemana: number; inicio: string; fim: string };

let proximaChave = 0;
const linha = (h: Partial<Horario> = {}): Linha => ({
  chave: proximaChave++,
  diaSemana: h.diaSemana ?? 1,
  inicio: h.inicio !== undefined ? horaDe(h.inicio) : "07:00",
  fim: h.fim !== undefined ? horaDe(h.fim) : "08:00",
});

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
  // Local inativo só aparece se for o atual da turma (AULAS-CA-09).
  const opcoesLocal = locais.filter((l) => l.ativo || l.id === turma?.local.id);
  const atualizar = (chave: number, mudanca: Partial<Linha>) =>
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));

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
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Nome da turma"
          id="nome"
          required
          minLength={2}
          maxLength={80}
          defaultValue={valor("nome", turma?.nome)}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="nivel" className="text-sm font-medium">
            Nível
          </label>
          <select
            id="nivel"
            name="nivel"
            className={classeCampo}
            defaultValue={valor("nivel", turma?.nivel ?? "INICIANTE")}
          >
            {Object.entries(NIVEIS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="localId" className="text-sm font-medium">
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
        <div className="flex flex-col gap-1">
          <label htmlFor="professorId" className="text-sm font-medium">
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
          type="number"
          min={1}
          max={40}
          required
          defaultValue={valor("vagas", turma?.vagas ?? 10)}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Dias e horários</legend>
        {linhas.map((l, i) => (
          <div key={l.chave} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              Dia {i + 1}
              <select
                className={`${classeCampo} w-auto`}
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
            <label className="flex flex-col gap-1 text-sm">
              Início
              <input
                type="time"
                className={`${classeCampo} w-auto`}
                value={l.inicio}
                onChange={(e) => atualizar(l.chave, { inicio: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Fim
              <input
                type="time"
                className={`${classeCampo} w-auto`}
                value={l.fim}
                onChange={(e) => atualizar(l.chave, { fim: e.target.value })}
                required
              />
            </label>
            {linhas.length > 1 && (
              <button
                type="button"
                className={classeBotaoSecundario}
                onClick={() => setLinhas((atuais) => atuais.filter((x) => x.chave !== l.chave))}
              >
                Remover
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className={`${classeBotaoSecundario} self-start`}
          onClick={() => setLinhas((atuais) => [...atuais, linha()])}
        >
          Adicionar dia
        </button>
      </fieldset>

      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Salvando..." : "Salvar turma"}
      </button>
    </form>
  );
}
