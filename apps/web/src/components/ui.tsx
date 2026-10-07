import type { ComponentProps, ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

const baseBotao =
  "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-semibold whitespace-nowrap transition duration-200 ease-mola select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55";

/** Ação principal da tela: roxo da marca com brilho. */
export const classeBotao = `${baseBotao} bg-linear-to-b from-[#8448f0] to-[#6d28d9] text-white shadow-[0_12px_32px_-12px_rgb(124_58_237_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.22)] hover:-translate-y-px hover:brightness-110`;
/** Ação de dinheiro (receber, vender, abrir o caixa): dourado das estrelas do logo. */
export const classeBotaoOuro = `${baseBotao} bg-linear-to-b from-[#f5bd1f] to-ouro text-fundo shadow-[0_12px_32px_-14px_rgb(233_171_2_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.35)] hover:-translate-y-px hover:brightness-105`;
export const classeBotaoSecundario = `${baseBotao} border border-borda bg-elevado/60 text-texto hover:border-roxo/50 hover:bg-elevado`;
export const classeBotaoFantasma = `${baseBotao} text-suave hover:bg-elevado hover:text-texto`;
export const classeBotaoPerigo = `${baseBotao} border border-perigo/40 bg-perigo/10 text-perigo hover:bg-perigo/20`;
/** Botão redondo só com ícone (o nome vai em texto para leitor de tela). */
export const classeBotaoIcone =
  "inline-grid size-11 shrink-0 place-items-center rounded-full border border-borda bg-elevado/60 text-suave transition duration-200 hover:border-roxo/50 hover:bg-elevado hover:text-texto active:scale-95";

export const classeCampo =
  "min-h-12 w-full rounded-2xl border border-borda bg-elevado/45 px-4 text-base text-texto placeholder:text-apagado/80 transition duration-200 hover:border-[#3a2f6b] focus:border-roxo focus:bg-elevado/80 focus:ring-4 focus:ring-roxo/20 focus:outline-none disabled:opacity-60";
export const classeCartao = "superficie rounded-[1.75rem] p-5 sm:p-6";
export const classeRotulo = "text-sm font-medium text-suave";

/** Seta dentro de um círculo, no fim dos botões que levam adiante. */
export function SetaDoBotao({ nome = "seta" }: { nome?: NomeIcone }) {
  return (
    <span className="-mr-3 grid size-8 place-items-center rounded-full bg-white/15">
      <Icone nome={nome} width={16} height={16} />
    </span>
  );
}

export function Campo({
  rotulo,
  id,
  icone,
  prefixo,
  ajuda,
  ...props
}: {
  rotulo: string;
  id: string;
  icone?: NomeIcone;
  prefixo?: string;
  ajuda?: ReactNode;
} & ComponentProps<"input">) {
  const recuo = icone ? "pl-11" : prefixo ? "pl-12" : "";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={classeRotulo}>
        {rotulo}
      </label>
      <div className="relative">
        {icone && (
          <Icone
            nome={icone}
            width={18}
            height={18}
            className="text-apagado pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
          />
        )}
        {prefixo && (
          <span
            className="text-apagado pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-semibold"
            aria-hidden="true"
          >
            {prefixo}
          </span>
        )}
        <input id={id} name={id} className={`${classeCampo} ${recuo}`} {...props} />
      </div>
      {ajuda && <p className="text-apagado text-xs">{ajuda}</p>}
    </div>
  );
}

/** Aviso que entra com animação: o sucesso desenha um "check", o erro balança. */
export function Aviso({
  tipo,
  children,
}: {
  tipo: "erro" | "sucesso" | "info";
  children: ReactNode;
}) {
  const estilos = {
    erro: "border-perigo/35 bg-perigo/10 animate-recusar",
    sucesso: "border-sucesso/35 bg-sucesso/10 animate-surgir",
    info: "border-ouro/35 bg-ouro/10 animate-surgir",
  };
  const icones = {
    erro: "bg-perigo/20 text-perigo",
    sucesso: "bg-sucesso/20 text-sucesso",
    info: "bg-ouro/20 text-ouro",
  };
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${estilos[tipo]}`}
    >
      <span
        className={`mt-px grid size-6 shrink-0 place-items-center rounded-full ${icones[tipo]}`}
      >
        {tipo === "sucesso" ? (
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray="100 200"
              className="animate-desenhar [animation-delay:120ms]"
            />
          </svg>
        ) : (
          <Icone
            nome={tipo === "erro" ? "alerta" : "raio"}
            width={14}
            height={14}
            strokeWidth={2.4}
          />
        )}
      </span>
      <span className="min-w-0 self-center">{children}</span>
    </p>
  );
}

export function AcessoNegado() {
  return (
    <section className={`${classeCartao} flex flex-col items-start gap-3`}>
      <span className="bg-perigo/15 text-perigo grid size-12 place-items-center rounded-2xl">
        <Icone nome="cadeado" />
      </span>
      <h1 className="text-2xl font-bold">Acesso negado</h1>
      <p className="text-suave">
        Seu perfil não tem acesso a esta área. Se precisar, fale com um administrador.
      </p>
    </section>
  );
}
