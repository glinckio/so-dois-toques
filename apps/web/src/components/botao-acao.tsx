"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/acoes/estado";
import { Carregando } from "@/components/base/bola";
import { JanelaDeConfirmacao, useConfirmacao } from "@/components/base/confirmacao";
import { Aviso, classeBotaoSecundario } from "@/components/ui";

type Acao = (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;

/**
 * Botão que dispara uma Server Action. Com `confirmar`, abre a janela de confirmação
 * do sistema (VIVO-CA-04): "Cancelar" ou Esc não fazem nada; "Confirmar" envia.
 */
export function BotaoAcao({
  acao,
  campos,
  rotulo,
  confirmar,
  className = classeBotaoSecundario,
}: {
  acao: Acao;
  campos: Record<string, string>;
  rotulo: string;
  confirmar?: string;
  className?: string;
}) {
  const [estado, executar, enviando] = useActionState(acao, ESTADO_INICIAL);
  const { janela, aoEnviar, confirmar: enviarConfirmado } = useConfirmacao(Boolean(confirmar));
  return (
    <form action={executar} onSubmit={aoEnviar} className="flex flex-col gap-2">
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <button type="submit" className={className} disabled={enviando} aria-busy={enviando}>
        {enviando && <Carregando />}
        {rotulo}
      </button>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      {confirmar && (
        <JanelaDeConfirmacao
          janela={janela}
          titulo={rotulo}
          mensagem={confirmar}
          aoConfirmar={enviarConfirmado}
        />
      )}
    </form>
  );
}
