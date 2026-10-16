import type { Metadata } from "next";
import { connection } from "next/server";
import { Destaque } from "@/components/base/cabecalho";
import { FormAvaliacao } from "@/components/feedback/form-avaliacao";
import { Aviso } from "@/components/ui";
import type { FormularioPublico } from "@/lib/feedback/painel";
import { chamarApi } from "@/lib/servidor/api";
import logo from "../../../public/marca/logo-256.png";

export const metadata: Metadata = {
  title: "Avalie as aulas | Só Dois Toques",
  description: "Conte o que você está achando das aulas do Só Dois Toques.",
};

/**
 * FEED-CA-01, 02 e 04: formulário público de feedback, sem login. Mostra só as turmas
 * ativas; pausado, avisa que não está recebendo respostas.
 */
export default async function PaginaAvaliar() {
  await connection();
  const formulario = await chamarApi<FormularioPublico>("/feedback/formulario", { sessao: false });

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="animate-entrar flex flex-col items-center gap-4 text-center">
        <span className="relative">
          <span className="bg-roxo/45 absolute inset-2 rounded-full blur-2xl" aria-hidden="true" />
          {/* next/image põe estilo embutido (color: transparent), barrado pela CSP. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.src}
            alt="Logo do Só Dois Toques"
            width={256}
            height={256}
            className="ring-roxo/40 relative size-24 rounded-full ring-2"
          />
        </span>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Como estão as <Destaque>aulas</Destaque>?
          </h1>
          <p className="text-suave mt-3">
            Sua opinião ajuda o Só Dois Toques a melhorar. Leva menos de um minuto.
          </p>
        </div>
      </header>

      <div className="vidro animate-entrar flex flex-col gap-4 rounded-[2rem] p-6 [animation-delay:80ms] sm:p-8">
        {!formulario.ok ? (
          <Aviso tipo="erro">{formulario.mensagem}</Aviso>
        ) : formulario.dados.pausado ? (
          <Aviso tipo="info">No momento não estamos recebendo respostas.</Aviso>
        ) : (
          <FormAvaliacao turmas={formulario.dados.turmas} />
        )}
      </div>

      <p className="text-apagado text-center text-xs">
        As respostas são lidas só pela coordenação do Só Dois Toques e usadas para melhorar as
        aulas. Não pedimos telefone nem e-mail.
      </p>
    </main>
  );
}
