"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { pagarReserva } from "@/app/acoes/horarios";
import { Aviso, classeBotao, classeCampo } from "@/components/ui";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";

/** HOR-CA-07: recebe o valor da reserva e lança no caixa. */
export function FormPagamento({
  reservaId,
  valorCentavos,
}: {
  reservaId: string;
  valorCentavos: number;
}) {
  const [estado, acao, enviando] = useActionState(pagarReserva, ESTADO_INICIAL);
  return (
    <form
      action={acao}
      aria-label="Receber pagamento"
      className="border-borda bg-cartao flex flex-col gap-3 rounded-2xl border p-4"
    >
      <h2 className="font-medium">Receber {formatarReais(valorCentavos)}</h2>
      <input type="hidden" name="reservaId" value={reservaId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="forma" className="text-sm font-medium">
          Forma de pagamento
        </label>
        <select id="forma" name="forma" className={classeCampo} defaultValue="PIX">
          {Object.entries(FORMAS).map(([forma, rotulo]) => (
            <option key={forma} value={forma}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Registrando..." : "Registrar pagamento"}
      </button>
    </form>
  );
}
