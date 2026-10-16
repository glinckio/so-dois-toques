"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { enviarFeedback } from "@/app/acoes/feedback";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotaoSecundario, classeCampo, classeRotulo } from "@/components/ui";
import { NOME_MAXIMO, NOTAS, ROTULOS_DAS_NOTAS, TEXTO_MAXIMO } from "@/lib/feedback/painel";

function AreaDeTexto({
  id,
  rotulo,
  placeholder,
  padrao,
}: {
  id: string;
  rotulo: string;
  placeholder: string;
  padrao: string;
}) {
  const [tamanho, setTamanho] = useState(padrao.length);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={classeRotulo}>
        {rotulo}
      </label>
      <textarea
        id={id}
        name={id}
        rows={4}
        maxLength={TEXTO_MAXIMO}
        placeholder={placeholder}
        defaultValue={padrao}
        onChange={(e) => setTamanho(e.currentTarget.value.length)}
        className={`${classeCampo} h-auto min-h-28 resize-y py-3`}
      />
      <p className="text-apagado text-right text-xs tabular-nums" aria-live="polite">
        {tamanho}/{TEXTO_MAXIMO}
      </p>
    </div>
  );
}

/**
 * FEED-CA-01: nota em estrelas (obrigatória), os dois textos, a turma e o nome, todos
 * opcionais. O campo "site" é a armadilha para robôs (FEED-CA-03): fica fora da tela.
 */
export function FormAvaliacao({
  turmas,
}: {
  turmas: readonly { id: string; descricao: string }[];
}) {
  const [estado, acao, enviando] = useActionState(enviarFeedback, ESTADO_INICIAL);
  const valor = (campo: string) => estado.valores?.[campo] ?? "";
  const [nota, setNota] = useState(Number(valor("nota")) || 0);

  if (estado.sucesso) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-6 text-center"
        data-testid="agradecimento"
      >
        <span className="bg-sucesso/15 text-sucesso grid size-16 place-items-center rounded-full">
          <Icone nome="check" width={30} height={30} strokeWidth={2.4} />
        </span>
        <h2 className="text-2xl font-extrabold">Obrigado!</h2>
        <p className="text-suave max-w-sm">
          Sua resposta foi enviada. Ela ajuda a gente a deixar as aulas cada vez melhores.
        </p>
      </div>
    );
  }

  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Avaliar as aulas"
      className="flex flex-col gap-6"
    >
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">
          Que nota você dá para as aulas? <span className="text-perigo">*</span>
        </legend>
        <div className="flex items-center gap-1">
          {NOTAS.map((n) => (
            <label key={n} className="cursor-pointer" title={ROTULOS_DAS_NOTAS[n]}>
              <input
                type="radio"
                name="nota"
                value={n}
                required
                defaultChecked={nota === n}
                onChange={() => setNota(n)}
                className="peer sr-only"
              />
              <span className="sr-only">
                {n} de 5, {ROTULOS_DAS_NOTAS[n]}
              </span>
              <Icone
                nome="estrela"
                width={44}
                height={44}
                strokeWidth={1.5}
                className={`peer-focus-visible:ring-roxo rounded-lg transition duration-150 peer-focus-visible:ring-2 hover:scale-110 ${
                  n <= nota ? "fill-ouro text-ouro" : "text-apagado"
                }`}
              />
            </label>
          ))}
        </div>
        <p className="text-suave min-h-5 text-sm" aria-live="polite">
          {nota > 0 ? ROTULOS_DAS_NOTAS[nota] : "Toque numa estrela"}
        </p>
      </fieldset>

      <AreaDeTexto
        id="comentario"
        rotulo="O que você está achando das aulas? (opcional)"
        placeholder="Conte o que está gostando"
        padrao={valor("comentario")}
      />
      <AreaDeTexto
        id="melhoria"
        rotulo="O que podemos melhorar? (opcional)"
        placeholder="Horários, treinos, estrutura…"
        padrao={valor("melhoria")}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="turmaId" className={classeRotulo}>
          Qual turma você faz? (opcional)
        </label>
        <select id="turmaId" name="turmaId" defaultValue={valor("turmaId")} className={classeCampo}>
          <option value="">Prefiro não dizer</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.descricao}
            </option>
          ))}
        </select>
      </div>

      <Campo
        rotulo="Seu nome (opcional)"
        id="nome"
        icone="pessoa"
        maxLength={NOME_MAXIMO}
        autoComplete="name"
        placeholder="Deixe em branco para responder anônimo"
        defaultValue={valor("nome")}
        ajuda="Seu nome é opcional. Se preferir, responda sem se identificar."
      />

      <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
        <label htmlFor="site">Site</label>
        <input id="site" name="site" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <BotaoEnviar enviando={enviando} textoEnviando="Enviando…">
          Enviar resposta
        </BotaoEnviar>
        <button type="reset" className={classeBotaoSecundario} onClick={() => setNota(0)}>
          Limpar
        </button>
      </div>
    </form>
  );
}
