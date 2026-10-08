"use client";

import { useActionState, useState, type FormEvent } from "react";
import { lancarAvulso } from "@/app/acoes/caixa";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/acoes/estado";
import { CabecalhoCartao } from "@/components/base/cartao";
import { BotaoEnviar } from "@/components/base/enviar";
import { ICONES_DAS_FORMAS, OpcoesEmBlocos, type Opcao } from "@/components/base/opcoes";
import { Valor } from "@/components/base/valor";
import { Icone, type NomeIcone } from "@/components/icones";
import { Aviso, Campo, classeBotao, SetaDoBotao } from "@/components/ui";
import { CATEGORIAS, CATEGORIAS_AVULSAS, type CategoriaAvulsa } from "@/lib/caixa/formatacao";
import { previaDoAvulso } from "@/lib/caixa/painel";
import { FORMAS } from "@/lib/mensalidades/formatacao";

const ICONES_DOS_AVULSOS: Record<CategoriaAvulsa, NomeIcone> = {
  SUPRIMENTO: "entrada",
  SANGRIA: "saida",
  DESPESA: "recibo",
  RECEITA_AVULSA: "estrela",
};

/** O que cada tipo faz, curto, para caber no bloco. */
const RESUMOS: Record<CategoriaAvulsa, string> = {
  SUPRIMENTO: "Dinheiro que entra na gaveta",
  SANGRIA: "Dinheiro que sai da gaveta",
  DESPESA: "Material, limpeza etc.",
  RECEITA_AVULSA: "Entrada que não é mensalidade",
};

const TIPOS: Opcao[] = (Object.keys(CATEGORIAS_AVULSAS) as CategoriaAvulsa[]).map((c) => ({
  valor: c,
  rotulo: CATEGORIAS[c],
  icone: ICONES_DOS_AVULSOS[c],
  detalhe: RESUMOS[c],
}));

const FORMAS_EM_BLOCOS: Opcao[] = Object.entries(FORMAS).map(([valor, rotulo]) => ({
  valor,
  rotulo,
  icone: ICONES_DAS_FORMAS[valor],
}));

/** CAIXA-CA-02: suprimento, sangria, despesa ou receita avulsa. */
export function FormAvulso() {
  const [estado, acao, enviando] = useActionState(lancarAvulso, ESTADO_INICIAL);
  // Depois de um erro, o formulário volta com o que foi digitado (e a prévia também).
  return (
    <Formulario
      key={JSON.stringify(estado.valores ?? null)}
      estado={estado}
      acao={acao}
      enviando={enviando}
    />
  );
}

function Formulario({
  estado,
  acao,
  enviando,
}: {
  estado: EstadoFormulario;
  acao: (form: FormData) => void;
  enviando: boolean;
}) {
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  const iniciais = {
    categoria: valor("categoria", "DESPESA"),
    forma: valor("forma", "DINHEIRO"),
    valor: valor("valor"),
  };
  const [atual, setAtual] = useState(iniciais);
  const previa = previaDoAvulso(atual.categoria, atual.valor, atual.forma);

  const aoMudar = (evento: FormEvent<HTMLFormElement>) => {
    const form = evento.currentTarget;
    const alvo = evento.target as HTMLInputElement;
    const forma = form.elements.namedItem("forma") as RadioNodeList | null;
    // Suprimento e sangria são só em dinheiro: ao escolher um deles, o dinheiro já vem marcado.
    if (
      alvo.name === "categoria" &&
      forma &&
      CATEGORIAS_AVULSAS[alvo.value as CategoriaAvulsa]?.soDinheiro
    ) {
      forma.value = "DINHEIRO";
    }
    const dados = new FormData(form);
    setAtual({
      categoria: String(dados.get("categoria") ?? ""),
      forma: String(dados.get("forma") ?? ""),
      valor: String(dados.get("valor") ?? ""),
    });
  };

  return (
    <form
      action={acao}
      onChange={aoMudar}
      onReset={() => setAtual(iniciais)}
      aria-label="Lançamento avulso"
      className="superficie @container flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6"
    >
      <CabecalhoCartao
        icone="caixa"
        titulo="Lançamento avulso"
        descricao="Suprimento, sangria, despesa ou receita"
      />
      <OpcoesEmBlocos
        nome="categoria"
        legenda="Tipo"
        idBase="tipo-avulso"
        opcoes={TIPOS}
        padrao={iniciais.categoria}
        colunas="grid-cols-1 @md:grid-cols-2"
      />
      <OpcoesEmBlocos
        nome="forma"
        legenda="Forma de pagamento"
        idBase="forma-avulso"
        opcoes={FORMAS_EM_BLOCOS}
        padrao={iniciais.forma}
        colunas="grid-cols-1 @sm:grid-cols-2"
      />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Campo
          rotulo="Valor (R$)"
          id="valor-avulso"
          name="valor"
          prefixo="R$"
          inputMode="decimal"
          autoComplete="off"
          required
          placeholder="50,00"
          defaultValue={iniciais.valor}
        />
        <Campo
          rotulo="Descrição"
          id="descricao"
          required
          minLength={3}
          maxLength={120}
          autoComplete="off"
          placeholder="Compra de garrafões de água"
          defaultValue={valor("descricao")}
        />
      </div>

      {previa && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors duration-300 ${
            previa.tipo === "ENTRADA"
              ? "border-sucesso/25 bg-sucesso/8"
              : "border-perigo/25 bg-perigo/8"
          }`}
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl ${
              previa.tipo === "ENTRADA" ? "bg-sucesso/15 text-sucesso" : "bg-perigo/15 text-perigo"
            }`}
          >
            <Icone nome={previa.tipo === "ENTRADA" ? "entrada" : "saida"} width={18} height={18} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold">{previa.texto}</span>
            {previa.alerta && (
              <span className="text-ouro text-xs font-semibold">{previa.alerta}</span>
            )}
          </span>
          {previa.valorCentavos !== null && (
            <span
              className={`shrink-0 text-xl font-extrabold ${
                previa.tipo === "ENTRADA" ? "text-sucesso" : "text-perigo"
              }`}
            >
              {previa.tipo === "ENTRADA" ? "+ " : "− "}
              <Valor centavos={previa.valorCentavos} />
            </span>
          )}
        </div>
      )}

      <p className="text-apagado flex items-start gap-2 text-xs">
        <Icone nome="alerta" width={14} height={14} className="mt-px shrink-0" />
        Suprimento e sangria são só em dinheiro. Não escreva nome de aluno: o lançamento não pode
        ser alterado depois.
      </p>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <BotaoEnviar enviando={enviando} className={`${classeBotao} self-start`}>
        Registrar lançamento
        <SetaDoBotao nome="mais" />
      </BotaoEnviar>
    </form>
  );
}
