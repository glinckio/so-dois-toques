"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { definirAssinatura } from "@/app/acoes/mensalidades";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { formatarReais, nomeDoMes, valorParaCampo } from "@/lib/mensalidades/formatacao";
import type { Assinatura, Plano } from "@/lib/mensalidades/tipos";

/** MENS-CA-02 e 03: define ou troca o plano do aluno a partir de um mês. */
export function FormAssinatura({
  alunoId,
  planos,
  vigente,
  meses,
}: {
  alunoId: string;
  planos: Plano[];
  vigente: Assinatura | null;
  /** Meses que podem ser escolhidos como início (o atual e os próximos). */
  meses: string[];
}) {
  const [estado, acao, enviando] = useActionState(definirAssinatura, ESTADO_INICIAL);
  const ativos = planos.filter((p) => p.ativo);
  // Depois de um erro, os campos voltam ao que foi digitado, não ao plano vigente.
  const valor = (campo: string, salvo: string) => estado.valores?.[campo] ?? salvo;
  return (
    <form
      // Remonta o formulário quando os valores devolvidos mudam: o React não atualiza o
      // valor inicial de um <select> depois de montado.
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      className="flex flex-col gap-4 rounded-lg border border-current/15 p-4"
    >
      <h3 className="font-medium">{vigente ? "Trocar o plano" : "Definir o plano"}</h3>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <input type="hidden" name="alunoId" value={alunoId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="planoId" className="text-sm font-medium">
            Plano
          </label>
          <select
            id="planoId"
            name="planoId"
            required
            className={classeCampo}
            defaultValue={valor("planoId", vigente?.plano.id ?? "")}
          >
            <option value="" disabled>
              Escolha
            </option>
            {ativos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({formatarReais(p.valorCentavos)})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="inicio" className="text-sm font-medium">
            A partir de
          </label>
          <select
            id="inicio"
            name="inicio"
            className={classeCampo}
            defaultValue={valor("inicio", meses[0] ?? "")}
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {nomeDoMes(m)}
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo="Dia de vencimento (1 a 28)"
          id="diaVencimento"
          type="number"
          min={1}
          max={28}
          required
          defaultValue={valor("diaVencimento", String(vigente?.diaVencimento ?? 10))}
        />
        <Campo
          rotulo="Desconto mensal (R$, opcional)"
          id="desconto"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={valor(
            "desconto",
            vigente && vigente.descontoCentavos > 0 ? valorParaCampo(vigente.descontoCentavos) : "",
          )}
        />
        <Campo
          rotulo="Motivo do desconto"
          id="motivoDesconto"
          maxLength={200}
          defaultValue={valor("motivoDesconto", vigente?.motivoDesconto ?? "")}
        />
      </div>
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        Salvar plano do aluno
      </button>
    </form>
  );
}
