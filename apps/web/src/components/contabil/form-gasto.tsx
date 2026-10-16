"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { lancarGasto } from "@/app/acoes/gastos";
import { BotaoEnviar } from "@/components/base/enviar";
import { ICONES_DAS_FORMAS, OpcoesEmBlocos } from "@/components/base/opcoes";
import { SeletorDeQuadra } from "@/components/horarios/seletor-de-quadra";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotao } from "@/components/ui";
import type { Quadra } from "@/lib/horarios/tipos";
import { FORMAS, type Forma } from "@/lib/mensalidades/formatacao";

const TIPOS = [
  { valor: "LOCACAO_AVULSA", rotulo: "Locação de quadra", icone: "areia" },
  { valor: "EQUIPAMENTO", rotulo: "Equipamento", icone: "sacola" },
  { valor: "INVESTIMENTO", rotulo: "Investimento", icone: "subir" },
  { valor: "OUTRO_GASTO", rotulo: "Outro gasto", icone: "recibo" },
] as const;

const FORMAS_EM_BLOCOS = (Object.keys(FORMAS) as Forma[]).map((f) => ({
  valor: f,
  rotulo: FORMAS[f],
  icone: ICONES_DAS_FORMAS[f],
}));

/**
 * GASTO-CA-05: tudo o que sai do caixa além do aluguel mensal: locação avulsa de quadra
 * (no dia X, R$ Y na quadra Z) e equipamentos, investimentos e outros gastos.
 */
export function FormGasto({ quadras, hoje }: { quadras: readonly Quadra[]; hoje: string }) {
  const [estado, acao, enviando] = useActionState(lancarGasto, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  const [tipo, setTipo] = useState(valor("tipo", "LOCACAO_AVULSA"));
  const locacao = tipo === "LOCACAO_AVULSA";
  return (
    <form
      key={estado.sucesso ?? JSON.stringify(estado.valores ?? null)}
      action={acao}
      onChange={(evento) => {
        const escolhido = new FormData(evento.currentTarget).get("tipo");
        if (typeof escolhido === "string") setTipo(escolhido);
      }}
      aria-label="Lançar gasto"
      className="flex flex-col gap-5"
    >
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <OpcoesEmBlocos
        nome="tipo"
        legenda="O que foi"
        padrao={tipo}
        colunas="grid-cols-2 lg:grid-cols-4"
        opcoes={TIPOS}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {locacao ? (
          <>
            <SeletorDeQuadra quadras={quadras} padrao={valor("quadraId") || undefined} />
            <Campo
              rotulo="Observação (opcional)"
              id="observacao"
              icone="editar"
              maxLength={120}
              placeholder="Treino extra de sábado"
              defaultValue={valor("observacao")}
            />
          </>
        ) : (
          <div className="sm:col-span-2">
            <Campo
              rotulo="Descrição"
              id="descricao"
              icone="editar"
              required
              minLength={3}
              maxLength={200}
              placeholder="Bolas e rede nova"
              defaultValue={valor("descricao")}
            />
          </div>
        )}
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
          Lançar gasto
        </BotaoEnviar>
      </div>
    </form>
  );
}
