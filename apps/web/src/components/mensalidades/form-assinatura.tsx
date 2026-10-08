"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { definirAssinatura } from "@/app/acoes/mensalidades";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeCampo, classeRotulo } from "@/components/ui";
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
      className="border-borda bg-elevado/30 flex flex-col gap-4 rounded-[1.5rem] border p-4 sm:p-5"
    >
      <h3 className="flex items-center gap-2 font-bold">
        <Icone
          nome={vigente ? "repetir" : "mais"}
          width={17}
          height={17}
          className="text-roxo-claro"
        />
        {vigente ? "Trocar o plano" : "Definir o plano"}
      </h3>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <input type="hidden" name="alunoId" value={alunoId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="planoId" className={classeRotulo}>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inicio" className={classeRotulo}>
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
          icone="calendario"
          type="number"
          min={1}
          max={28}
          required
          defaultValue={valor("diaVencimento", String(vigente?.diaVencimento ?? 10))}
        />
        <Campo
          rotulo="Desconto mensal (R$, opcional)"
          id="desconto"
          prefixo="R$"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={valor(
            "desconto",
            vigente && vigente.descontoCentavos > 0 ? valorParaCampo(vigente.descontoCentavos) : "",
          )}
        />
        <div className="sm:col-span-2">
          <Campo
            rotulo="Motivo do desconto"
            id="motivoDesconto"
            maxLength={200}
            defaultValue={valor("motivoDesconto", vigente?.motivoDesconto ?? "")}
          />
        </div>
      </div>
      <div>
        <BotaoEnviar
          enviando={enviando}
          icone={<Icone nome="check" width={18} height={18} strokeWidth={2.4} />}
        >
          Salvar plano do aluno
        </BotaoEnviar>
      </div>
    </form>
  );
}
