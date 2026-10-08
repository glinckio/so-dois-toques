"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/acoes/estado";
import { JanelaDeConfirmacao, useConfirmacao } from "@/components/base/confirmacao";
import { BotaoEnviar } from "@/components/base/enviar";
import { SeloIcone } from "@/components/base/selo";
import { Aviso, Campo, classeBotaoPerigo } from "@/components/ui";

type Acao = (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;

/**
 * Ação que exige motivo (cancelar mensalidade, estornar pagamento ou lançamento).
 * Com `confirmar`, o envio abre a confirmação do sistema com esse texto (VIVO-CA-04):
 * "Cancelar" ou Esc não fazem nada; "Confirmar" envia.
 */
export function FormMotivo({
  acao,
  campos,
  titulo,
  explicacao,
  rotulo,
  idCampo,
  confirmar,
}: {
  acao: Acao;
  campos: Record<string, string>;
  titulo: string;
  explicacao: string;
  rotulo: string;
  idCampo: string;
  /** Risco da ação, escrito na janela de confirmação. Sem ele, envia direto. */
  confirmar?: string;
}) {
  const [estado, executar, enviando] = useActionState(acao, ESTADO_INICIAL);
  const { janela, aoEnviar, confirmar: enviarConfirmado } = useConfirmacao(Boolean(confirmar));
  return (
    <form
      action={executar}
      onSubmit={aoEnviar}
      aria-label={titulo}
      className="border-perigo/25 flex flex-col gap-4 rounded-[1.5rem] border bg-linear-to-br from-[#2a0f1f]/70 to-transparent p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <SeloIcone nome="alerta" tom="perigo" tamanho="p" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="leading-tight font-bold">{titulo}</h3>
          <p className="text-suave text-sm">{explicacao}</p>
        </div>
      </div>
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <Campo
        rotulo="Motivo"
        id={idCampo}
        name="motivo"
        required
        minLength={3}
        maxLength={200}
        autoComplete="off"
      />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <BotaoEnviar enviando={enviando} className={`${classeBotaoPerigo} self-start`}>
        {rotulo}
      </BotaoEnviar>
      {confirmar && (
        <JanelaDeConfirmacao
          janela={janela}
          titulo={`${titulo}?`}
          mensagem={confirmar}
          aoConfirmar={enviarConfirmado}
        />
      )}
    </form>
  );
}
