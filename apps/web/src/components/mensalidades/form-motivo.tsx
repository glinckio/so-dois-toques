"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotaoSecundario } from "@/components/ui";

type Acao = (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;

/** Ação que exige motivo (cancelar mensalidade, estornar pagamento). */
export function FormMotivo({
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
  return (
    <form
      action={executar}
      aria-label={titulo}
      className="border-perigo/40 bg-perigo/5 flex flex-col gap-3 rounded-2xl border p-4"
    >
      <h3 className="font-medium">{titulo}</h3>
      <p className="text-suave text-sm">{explicacao}</p>
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <Campo rotulo="Motivo" id={idCampo} name="motivo" required minLength={3} maxLength={200} />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <button type="submit" className={`${classeBotaoSecundario} self-start`} disabled={enviando}>
        {rotulo}
      </button>
    </form>
  );
}
