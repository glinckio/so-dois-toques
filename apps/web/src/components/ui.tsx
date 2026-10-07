import type { ComponentProps, ReactNode } from "react";

export const classeBotao =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-roxo-forte px-5 font-semibold text-white shadow-lg shadow-roxo-forte/25 transition-colors hover:bg-[#8b4cf3] disabled:opacity-60";
export const classeBotaoSecundario =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-borda bg-elevado/60 px-5 font-medium text-texto transition-colors hover:border-roxo/60 hover:bg-elevado disabled:opacity-60";
export const classeCampo =
  "min-h-11 w-full rounded-xl border border-borda bg-elevado/70 px-3 text-base text-texto placeholder:text-apagado focus:border-roxo focus:outline-2 focus:outline-roxo/40";
export const classeCartao = "rounded-2xl border border-borda bg-cartao p-4 sm:p-5";

export function Campo({
  rotulo,
  id,
  ...props
}: { rotulo: string; id: string } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <input id={id} name={id} className={classeCampo} {...props} />
    </div>
  );
}

export function Aviso({
  tipo,
  children,
}: {
  tipo: "erro" | "sucesso" | "info";
  children: ReactNode;
}) {
  const cores = {
    erro: "border-perigo/40 bg-perigo/10",
    sucesso: "border-sucesso/40 bg-sucesso/10",
    info: "border-ouro/40 bg-ouro/10",
  };
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`rounded-xl border px-3 py-2 text-sm ${cores[tipo]}`}
    >
      {children}
    </p>
  );
}

export function AcessoNegado() {
  return (
    <section className={`${classeCartao} flex flex-col gap-2`}>
      <h1 className="text-2xl font-semibold">Acesso negado</h1>
      <p className="text-suave">
        Seu perfil não tem acesso a esta área. Se precisar, fale com um administrador.
      </p>
    </section>
  );
}
