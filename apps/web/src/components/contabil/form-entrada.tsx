"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { lancarEntrada } from "@/app/acoes/gastos";
import { BotaoEnviar } from "@/components/base/enviar";
import { ICONES_DAS_FORMAS, OpcoesEmBlocos } from "@/components/base/opcoes";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotao } from "@/components/ui";
import { FORMAS, type Forma } from "@/lib/mensalidades/formatacao";

const TIPOS = [
  {
    valor: "OUTRA_RECEITA",
    rotulo: "Outra receita",
    icone: "dinheiro",
    detalhe: "Aula avulsa, evento, patrocínio. Entra no resultado.",
  },
  {
    valor: "APORTE",
    rotulo: "Aporte",
    icone: "mais",
    detalhe: "Dinheiro que o dono põe no caixa. Não é receita.",
  },
] as const;

const FORMAS_EM_BLOCOS = (Object.keys(FORMAS) as Forma[]).map((f) => ({
  valor: f,
  rotulo: FORMAS[f],
  icone: ICONES_DAS_FORMAS[f],
}));

/**
 * ENTRADA-CA-01: o que entra no caixa à mão, além das mensalidades: outra receita (é
 * receita) ou aporte (dinheiro do dono, que não é receita).
 */
export function FormEntrada({ hoje }: { hoje: string }) {
  const [estado, acao, enviando] = useActionState(lancarEntrada, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  return (
    <form
      key={estado.sucesso ?? JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Lançar entrada"
      className="flex flex-col gap-5"
    >
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <OpcoesEmBlocos
        nome="tipo"
        legenda="O que foi"
        padrao={valor("tipo", "OUTRA_RECEITA")}
        colunas="grid-cols-1 sm:grid-cols-2"
        opcoes={TIPOS}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo
            rotulo="Descrição"
            id="descricao"
            icone="editar"
            required
            minLength={3}
            maxLength={200}
            placeholder="Aula avulsa de sábado"
            defaultValue={valor("descricao")}
          />
        </div>
        <Campo
          rotulo="Dia"
          id="data"
          type="date"
          icone="calendario"
          required
          max={hoje}
          defaultValue={valor("data", hoje)}
        />
        <Campo
          rotulo="Valor (R$)"
          id="valor"
          prefixo="R$"
          inputMode="decimal"
          required
          placeholder="120,00"
          defaultValue={valor("valor")}
        />
      </div>
      <OpcoesEmBlocos
        nome="forma"
        legenda="Forma de pagamento"
        opcoes={FORMAS_EM_BLOCOS}
        padrao={valor("forma", "PIX")}
        colunas="grid-cols-2 lg:grid-cols-4"
      />
      <div>
        <BotaoEnviar
          enviando={enviando}
          textoEnviando="Lançando..."
          className={classeBotao}
          icone={<Icone nome="check" width={18} height={18} strokeWidth={2.4} />}
        >
          Lançar entrada
        </BotaoEnviar>
      </div>
    </form>
  );
}
