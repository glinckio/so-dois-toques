"use client";

import { useActionState, useState } from "react";
import { salvarTurma } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeCampo, classeRotulo } from "@/components/ui";
import {
  CATEGORIAS,
  DIAS_SEMANA,
  horaDe,
  minutosDe,
  NIVEIS,
  type Categoria,
  type Nivel,
} from "@/lib/aulas/formatacao";
import type { TurmaResumo } from "@/lib/aulas/tipos";
import { GrupoDoFormulario } from "./grupo-do-formulario";
import { SinalDoNivel } from "./selo-nivel";

const DICAS_DO_NIVEL: Record<Nivel, string> = {
  INICIANTE: "Primeiros toques",
  INTERMEDIARIO: "Já joga em rede",
  AVANCADO: "Jogo e tática",
};

/**
 * TURMA-CA-01: a turma é um dia, um horário, um nível e as vagas. Quem treina mais de
 * uma vez por semana é matriculado em mais de uma turma.
 */
export function FormTurma({ turma }: { turma?: TurmaResumo }) {
  const [estado, acao, enviando] = useActionState(salvarTurma, ESTADO_INICIAL);
  // Depois de um erro, os campos voltam ao que foi digitado, não à turma salva.
  const valor = (campo: string, salvo?: string | number) =>
    estado.valores?.[campo] ?? (salvo === undefined ? "" : String(salvo));
  const [inicio, setInicio] = useState(
    valor("horaInicio", turma ? horaDe(turma.horaInicio) : "19:00"),
  );
  const [fim, setFim] = useState(valor("horaFim", turma ? horaDe(turma.horaFim) : "20:00"));
  const minutosInicio = minutosDe(inicio);
  const minutosFim = minutosDe(fim);
  const invertido = minutosInicio !== null && minutosFim !== null && minutosFim <= minutosInicio;
  const nivelEscolhido = valor("nivel", turma?.nivel ?? "INICIANTE");
  const categoriaEscolhida = valor("categoria", turma?.categoria ?? "");

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

      <GrupoDoFormulario
        legenda="Dia e horário"
        icone="relogio"
        tom="ouro"
        dica="Duas turmas não dividem o mesmo horário da quadra."
      >
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="diaSemana" className={classeRotulo}>
            Dia da semana
          </label>
          <select
            id="diaSemana"
            name="diaSemana"
            className={classeCampo}
            required
            defaultValue={valor("diaSemana", turma?.diaSemana ?? 1)}
          >
            {DIAS_SEMANA.map((nome, dia) => (
              <option key={dia} value={dia}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="horaInicio" className={classeRotulo}>
            Início
          </label>
          <input
            id="horaInicio"
            name="horaInicio"
            type="time"
            min="05:00"
            max="23:59"
            required
            className={classeCampo}
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="horaFim" className={classeRotulo}>
            Fim
          </label>
          <input
            id="horaFim"
            name="horaFim"
            type="time"
            min="05:00"
            max="23:59"
            required
            className={classeCampo}
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
        {invertido && (
          <p className="text-ouro flex items-center gap-1.5 text-xs font-semibold sm:col-span-2">
            <Icone nome="alerta" width={14} height={14} />O fim precisa ser depois do início.
          </p>
        )}
      </GrupoDoFormulario>

      <GrupoDoFormulario legenda="Nível, categoria e vagas" icone="aulas">
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
        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="text-suave mb-1.5 text-sm font-medium">Categoria</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
              <label
                key={c}
                htmlFor={`categoria-${c}`}
                className="border-borda bg-elevado/40 has-checked:border-roxo has-checked:bg-roxo-forte/20 has-focus-visible:outline-ouro flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border px-3 text-sm font-bold transition duration-200 hover:border-[#3a2f6b] active:scale-[0.98] has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
              >
                <input
                  id={`categoria-${c}`}
                  type="radio"
                  name="categoria"
                  value={c}
                  required
                  defaultChecked={categoriaEscolhida === c}
                  className="sr-only"
                />
                {CATEGORIAS[c]}
              </label>
            ))}
          </div>
        </fieldset>
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
