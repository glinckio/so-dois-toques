import type { ComponentProps, ReactNode } from "react";

export const classeBotao =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-amber-600 px-4 font-medium text-white hover:bg-amber-700 disabled:opacity-60";
export const classeBotaoSecundario =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-current/25 px-4 font-medium hover:bg-current/5 disabled:opacity-60";
export const classeCampo =
  "min-h-11 w-full rounded-md border border-current/25 bg-transparent px-3 text-base focus:outline-2 focus:outline-amber-600";

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
    erro: "border-red-600/40 bg-red-600/10",
    sucesso: "border-green-600/40 bg-green-600/10",
    info: "border-amber-600/40 bg-amber-600/10",
  };
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-sm ${cores[tipo]}`}
    >
      {children}
    </p>
  );
}

export function AcessoNegado() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Acesso negado</h1>
      <p className="opacity-80">
        Seu perfil não tem acesso a esta área. Se precisar, fale com um administrador.
      </p>
    </section>
  );
}
