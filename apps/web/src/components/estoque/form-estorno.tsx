"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/acoes/estado";
import { JanelaDeConfirmacao, useConfirmacao } from "@/components/base/confirmacao";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotaoPerigo } from "@/components/ui";

type Acao = (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;

/**
 * ESTQ-CA-06 e VIVO-CA-04: estorno com motivo. O botão abre a confirmação do sistema
 * com o que vai acontecer; só "Confirmar" envia.
 */
export function FormEstorno({
  acao,
  campos,
  titulo,
  explicacao,
  rotulo,
  idCampo,
}: {
  acao: Acao;
  campos: Record<string, string>;
  titulo: string;
  explicacao: string;
  rotulo: string;
  idCampo: string;
}) {
  const [estado, executar, enviando] = useActionState(acao, ESTADO_INICIAL);
  const { janela, aoEnviar, confirmar } = useConfirmacao(true);
  return (
    <form
      action={executar}
      onSubmit={aoEnviar}
      aria-label={titulo}
      className="border-perigo/30 bg-perigo/5 animate-surgir flex flex-col gap-3 rounded-2xl border p-4"
    >
      <p className="text-suave flex items-start gap-2 text-sm">
        <Icone nome="alerta" width={16} height={16} className="text-perigo mt-0.5 shrink-0" />
        {explicacao}
      </p>
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <Campo
        rotulo="Motivo"
        id={idCampo}
        name="motivo"
        icone="editar"
        required
        minLength={3}
        maxLength={200}
        placeholder="Ex.: cliente desistiu"
      />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <BotaoEnviar
        enviando={enviando}
        className={`${classeBotaoPerigo} self-start`}
        icone={<Icone nome="estorno" width={18} height={18} />}
      >
        {rotulo}
      </BotaoEnviar>
      <JanelaDeConfirmacao
        janela={janela}
        titulo={`${rotulo}?`}
        mensagem={explicacao}
        aoConfirmar={confirmar}
      />
    </form>
  );
}
