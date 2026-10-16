"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { encerrarContrato, registrarContrato } from "@/app/acoes/gastos";
import { BotaoEnviar } from "@/components/base/enviar";
import { ICONES_DAS_FORMAS, OpcoesEmBlocos } from "@/components/base/opcoes";
import { SeletorDeQuadra } from "@/components/horarios/seletor-de-quadra";
import { Icone } from "@/components/icones";
import {
  Aviso,
  Campo,
  classeBotao,
  classeBotaoPerigo,
  classeCampo,
  classeRotulo,
} from "@/components/ui";
import { DIAS_SEMANA } from "@/lib/aulas/formatacao";
import type { Quadra } from "@/lib/horarios/tipos";
import { FORMAS, type Forma } from "@/lib/mensalidades/formatacao";

const FORMAS_EM_BLOCOS = (Object.keys(FORMAS) as Forma[]).map((f) => ({
  valor: f,
  rotulo: FORMAS[f],
  icone: ICONES_DAS_FORMAS[f],
}));

/**
 * GASTO-CA-03: "toda terça, das 19:00 às 20:00, na quadra X, pago R$ Y por mês". O
 * aluguel sai do caixa sozinho no dia do pagamento de cada mês (GASTO-CA-04).
 */
export function FormContrato({
  quadras,
  mesAtual,
}: {
  quadras: readonly Quadra[];
  mesAtual: string;
}) {
  const [estado, acao, enviando] = useActionState(registrarContrato, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  return (
    <form
      key={estado.sucesso ?? JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Novo contrato mensal"
      className="flex flex-col gap-5"
    >
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SeletorDeQuadra
          quadras={quadras}
          padrao={valor("quadraId") || undefined}
          className="sm:col-span-2"
        />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="diaSemana" className={classeRotulo}>
            Dia da semana
          </label>
          <select
            id="diaSemana"
            name="diaSemana"
            required
            className={classeCampo}
            defaultValue={valor("diaSemana", "2")}
          >
            {DIAS_SEMANA.map((nome, dia) => (
              <option key={dia} value={dia}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo="Início"
          id="horaInicio"
          type="time"
          icone="relogio"
          min="05:00"
          max="23:59"
          required
          defaultValue={valor("horaInicio", "19:00")}
        />
        <Campo
          rotulo="Fim"
          id="horaFim"
          type="time"
          icone="relogio"
          min="05:00"
          max="23:59"
          required
          defaultValue={valor("horaFim", "20:00")}
        />
        <Campo
          rotulo="Valor por mês (R$)"
          id="valor"
          prefixo="R$"
          inputMode="decimal"
          required
          placeholder="800,00"
          defaultValue={valor("valor")}
        />
        <Campo
          rotulo="Dia do pagamento (1 a 28)"
          id="diaPagamento"
          type="number"
          icone="calendario"
          min={1}
          max={28}
          required
          defaultValue={valor("diaPagamento", "10")}
        />
        <Campo
          rotulo="Primeiro mês pago"
          id="inicio"
          type="month"
          icone="calendario"
          min={mesAtual}
          required
          defaultValue={valor("inicio", mesAtual)}
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
          textoEnviando="Registrando..."
          className={classeBotao}
          icone={<Icone nome="check" width={18} height={18} strokeWidth={2.4} />}
        >
          Registrar contrato
        </BotaoEnviar>
      </div>
    </form>
  );
}

/** GASTO-CA-04: encerra o contrato a partir de um mês (daquele mês em diante, não lança). */
export function FormEncerrarContrato({
  contratoId,
  mesAtual,
}: {
  contratoId: string;
  mesAtual: string;
}) {
  const [estado, acao, enviando] = useActionState(encerrarContrato, ESTADO_INICIAL);
  return (
    <form action={acao} aria-label="Encerrar contrato" className="flex flex-col gap-2">
      <input type="hidden" name="contratoId" value={contratoId} />
      <div className="flex flex-wrap items-end gap-2">
        <Campo
          rotulo="Sem aluguel a partir de"
          id={`fim-${contratoId}`}
          name="fim"
          type="month"
          min={mesAtual}
          required
          defaultValue={mesAtual}
        />
        <BotaoEnviar enviando={enviando} className={classeBotaoPerigo}>
          Encerrar
        </BotaoEnviar>
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
    </form>
  );
}
