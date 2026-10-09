"use client";

import { useActionState, useState } from "react";
import { fecharCaixa } from "@/app/acoes/caixa";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/acoes/estado";
import { CabecalhoCartao } from "@/components/base/cartao";
import { CampoReais } from "@/components/base/campos-com-mascara";
import { BotaoEnviar } from "@/components/base/enviar";
import { Valor } from "@/components/base/valor";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoSecundario, classeCampo, classeRotulo } from "@/components/ui";
import { diferencaDoFechamento, TOM_DA_DIFERENCA } from "@/lib/caixa/painel";

/**
 * CAIXA-CA-04: conta a gaveta. A diferença para o esperado aparece enquanto se
 * digita: verde quando bate ou sobra dinheiro (AJU-CA-04), vermelha quando falta.
 * Qualquer diferença exige observação (quem confere é a API).
 */
export function FormFechamento({
  turnoId,
  esperadoCentavos,
}: {
  turnoId: string;
  esperadoCentavos: number;
}) {
  const [estado, acao, enviando] = useActionState(fecharCaixa, ESTADO_INICIAL);
  return (
    <Formulario
      key={JSON.stringify(estado.valores ?? null)}
      estado={estado}
      acao={acao}
      enviando={enviando}
      turnoId={turnoId}
      esperadoCentavos={esperadoCentavos}
    />
  );
}

function Formulario({
  estado,
  acao,
  enviando,
  turnoId,
  esperadoCentavos,
}: {
  estado: EstadoFormulario;
  acao: (form: FormData) => void;
  enviando: boolean;
  turnoId: string;
  esperadoCentavos: number;
}) {
  const [contado, setContado] = useState(estado.valores?.contado ?? "");
  const diferenca = diferencaDoFechamento(contado, esperadoCentavos);
  const tom = TOM_DA_DIFERENCA[diferenca.situacao];
  const cores = {
    neutro: "border-borda bg-elevado/35 text-suave",
    ouro: "border-ouro/30 bg-ouro/8 text-ouro",
    sucesso: "border-sucesso/35 bg-sucesso/10 text-sucesso",
    perigo: "border-perigo/35 bg-perigo/10 text-perigo",
  }[tom];

  return (
    <form
      action={acao}
      aria-label="Fechar caixa"
      className="superficie flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6"
    >
      <CabecalhoCartao
        icone="cadeado"
        tom="ouro"
        titulo="Fechar caixa"
        descricao="Conte o dinheiro da gaveta"
      />
      <input type="hidden" name="turnoId" value={turnoId} />

      <div className="border-borda bg-noite/30 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
        <span className="text-suave flex items-center gap-2 text-sm">
          <Icone nome="dinheiro" width={17} height={17} className="text-sucesso" />
          Esperado agora
        </span>
        <Valor centavos={esperadoCentavos} className="text-xl font-extrabold" />
      </div>

      <CampoReais
        rotulo="Dinheiro contado (R$)"
        id="contado"
        required
        defaultValue={estado.valores?.contado ?? ""}
        onChange={(e) => setContado(e.currentTarget.value)}
      />

      <div
        data-testid="diferenca-fechamento"
        data-tom={tom}
        aria-live="polite"
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors duration-300 ${cores}`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-current/15">
          {diferenca.situacao === "bate" ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="m5 12.5 4.5 4.5L19 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={100}
                strokeDasharray="100 200"
                className="animate-desenhar"
              />
            </svg>
          ) : (
            <Icone
              nome={
                diferenca.situacao === "vazio"
                  ? "dinheiro"
                  : diferenca.situacao === "sobra"
                    ? "entrada"
                    : "alerta"
              }
              width={19}
              height={19}
            />
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-lg leading-tight font-extrabold">{diferenca.titulo}</span>
          <span className="text-suave text-sm">{diferenca.detalhe}</span>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="observacao" className={classeRotulo}>
          Observação (obrigatória se não bater)
        </label>
        <textarea
          id="observacao"
          name="observacao"
          maxLength={300}
          rows={2}
          className={`${classeCampo} py-3 ${
            diferenca.situacao === "falta"
              ? "ring-perigo/35 ring-2"
              : diferenca.situacao === "sobra"
                ? "ring-sucesso/35 ring-2"
                : ""
          }`}
          defaultValue={estado.valores?.observacao ?? ""}
        />
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <BotaoEnviar
        enviando={enviando}
        className={`${classeBotaoSecundario} self-start`}
        icone={<Icone nome="cadeado" width={18} height={18} />}
      >
        Fechar caixa
      </BotaoEnviar>
    </form>
  );
}
