import type { Metadata } from "next";
import { connection } from "next/server";
import { BolaBrilhante } from "@/components/base/bola";
import { Destaque } from "@/components/base/cabecalho";
import { Icone, type NomeIcone } from "@/components/icones";
import { Aviso } from "@/components/ui";
import logo from "../../../public/marca/logo-256.png";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar | Só Dois Toques" };

const AREAS: { icone: NomeIcone; nome: string; texto: string }[] = [
  { icone: "aulas", nome: "Aulas", texto: "Turmas e presença" },
  { icone: "horarios", nome: "Quadras", texto: "Reservas das quadras" },
  { icone: "estoque", nome: "Lanchonete", texto: "Vendas e estoque" },
  { icone: "caixa", nome: "Caixa", texto: "Turnos e fechamento" },
];

function Logo({ className }: { className: string }) {
  return (
    <>
      {/* next/image põe estilo embutido (color: transparent), barrado pela CSP. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        alt="Logo do Só Dois Toques"
        width={256}
        height={256}
        className={className}
      />
    </>
  );
}

/** Login: a marca à esquerda (computador) e o formulário num cartão de vidro. */
export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  await connection();
  const { expirada } = await searchParams;
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-8 px-4 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8">
      <section
        aria-label="Só Dois Toques"
        className="superficie-destaque animate-entrar relative hidden min-h-[36rem] flex-col justify-between overflow-hidden rounded-[2.25rem] p-10 lg:flex"
      >
        <span
          className="bg-roxo/30 absolute -top-24 -right-24 size-80 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <span
          className="bg-ouro/15 absolute -bottom-28 -left-20 size-72 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-4">
          <span className="relative">
            <span className="bg-roxo/50 absolute inset-0 rounded-full blur-xl" aria-hidden="true" />
            <Logo className="ring-roxo/50 relative size-20 rounded-full ring-2" />
          </span>
          <span className="text-roxo-claro text-xs font-bold tracking-[0.18em] uppercase">
            São Leopoldo · RS
          </span>
        </div>
        <div className="relative flex flex-col gap-5">
          <p className="max-w-md text-[2.6rem] leading-[1.05] font-extrabold tracking-tight">
            Do primeiro <Destaque>saque</Destaque> ao fechamento do caixa.
          </p>
          <p className="text-suave max-w-sm">
            Tudo do Só Dois Toques num lugar só, no celular da quadra e no computador da recepção.
          </p>
        </div>
        <ul className="relative grid grid-cols-2 gap-3">
          {AREAS.map((a, i) => (
            <li
              key={a.nome}
              className={`vidro animate-entrar flex items-center gap-3 rounded-2xl p-3 ${["[animation-delay:150ms]", "[animation-delay:220ms]", "[animation-delay:290ms]", "[animation-delay:360ms]"][i]}`}
            >
              <span className="bg-roxo/20 text-roxo-claro grid size-10 shrink-0 place-items-center rounded-xl">
                <Icone nome={a.icone} width={19} height={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{a.nome}</span>
                <span className="text-apagado block truncate text-xs">{a.texto}</span>
              </span>
            </li>
          ))}
        </ul>
        <BolaBrilhante tamanho={88} className="absolute top-9 right-10" />
      </section>

      <div className="animate-entrar mx-auto flex w-full max-w-md flex-col gap-6 [animation-delay:80ms]">
        <header className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          <span className="relative lg:hidden">
            <span
              className="bg-roxo/45 absolute inset-2 rounded-full blur-2xl"
              aria-hidden="true"
            />
            <Logo className="ring-roxo/40 relative size-28 rounded-full ring-2" />
          </span>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Só Dois Toques</h1>
            <p className="text-suave mt-2">Entre com seu e-mail e senha.</p>
          </div>
        </header>
        <div className="vidro flex flex-col gap-4 rounded-[2rem] p-6 shadow-[0_40px_80px_-40px_rgb(124_58_237_/_0.6)] sm:p-8">
          {expirada && <Aviso tipo="info">Sua sessão expirou. Entre novamente.</Aviso>}
          <FormLogin />
        </div>
        <p className="text-apagado text-center text-xs lg:text-left">
          Esqueceu a senha? Peça uma senha temporária ao administrador.
        </p>
      </div>
    </main>
  );
}
