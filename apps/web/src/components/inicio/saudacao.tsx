import Link from "next/link";
import { Anel } from "@/components/base/anel";
import { BolaBrilhante } from "@/components/base/bola";
import { Destaque } from "@/components/base/cabecalho";
import { Icone, type NomeIcone } from "@/components/icones";
import type { Perfil } from "@/lib/acesso/areas";

export type AcaoDoInicio = { rotulo: string; href: string; icone: NomeIcone };
export type AnelDoDia = {
  titulo: string;
  fracao: number;
  centro: string;
  detalhe: string;
  tom: "roxo" | "ouro" | "sucesso" | "areia";
};

const CONVITE: Record<Perfil, { antes: string; palavra: string; depois: string }> = {
  ADMINISTRADOR: { antes: "Como está a ", palavra: "quadra", depois: " hoje?" },
  PROFESSOR: { antes: "Pronto para a próxima ", palavra: "aula", depois: "?" },
  ATENDENTE: { antes: "Bora fazer a ", palavra: "quadra", depois: " girar hoje?" },
};

/**
 * Abertura do Início: a data, a saudação com a palavra em destaque, as ações mais
 * usadas do perfil e o dia em anéis (aulas dadas, ocupação das quadras, estoque).
 */
export function Saudacao({
  nome,
  perfil,
  rotuloPerfil,
  data,
  acoes,
  aneis,
}: {
  nome: string;
  perfil: Perfil;
  rotuloPerfil: string;
  data: string;
  acoes: readonly AcaoDoInicio[];
  aneis: readonly AnelDoDia[];
}) {
  const convite = CONVITE[perfil];
  return (
    <header className="superficie-destaque relative grid grid-cols-1 gap-8 overflow-hidden rounded-[2rem] p-6 sm:p-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:items-center">
      <span
        className="bg-roxo/25 absolute -top-28 -right-20 size-80 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <span
        className="bg-ouro/10 absolute -bottom-32 left-1/3 size-72 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <BolaBrilhante tamanho={64} className="absolute top-6 right-6 max-sm:hidden xl:hidden" />

      <div className="relative flex min-w-0 flex-col gap-5">
        <span className="vidro text-suave inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold">
          <Icone nome="calendario" width={16} height={16} className="text-ouro" />
          <span className="first-letter:uppercase">{data}</span>
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="text-[2rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[2.6rem]">
            <span className="text-suave block text-[0.62em] font-bold">Olá, {nome}.</span>{" "}
            <span className="block">
              {convite.antes}
              <Destaque>{convite.palavra}</Destaque>
              {convite.depois}
            </span>
          </h1>
          <p className="text-apagado text-sm">{rotuloPerfil} · Só Dois Toques, São Leopoldo</p>
        </div>
        {acoes.length > 0 && (
          <nav aria-label="Ações rápidas">
            {/* Celular: atalhos em blocos, como os de um aplicativo. */}
            <ul className="grid grid-cols-4 gap-2 sm:hidden">
              {acoes.map((acao, i) => (
                <li key={acao.href}>
                  <Link
                    href={acao.href}
                    className="flex flex-col items-center gap-1.5 text-center text-[0.7rem] leading-tight font-semibold active:scale-95"
                  >
                    <span
                      className={`grid size-14 place-items-center rounded-[1.1rem] ${
                        i === 0
                          ? "to-ouro text-fundo bg-linear-to-b from-[#f5bd1f] shadow-[0_12px_30px_-14px_rgb(233_171_2_/_0.9)]"
                          : "vidro text-roxo-claro"
                      }`}
                    >
                      <Icone nome={acao.icone} width={22} height={22} />
                    </span>
                    {acao.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-2 max-sm:hidden">
              {acoes.map((acao, i) => (
                <li key={acao.href}>
                  <Link
                    href={acao.href}
                    className={`group inline-flex min-h-12 items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold transition duration-200 active:scale-[0.97] ${
                      i === 0
                        ? "to-ouro text-fundo bg-linear-to-b from-[#f5bd1f] shadow-[0_12px_30px_-14px_rgb(233_171_2_/_0.9)] hover:brightness-105"
                        : "vidro text-texto hover:border-roxo/50"
                    }`}
                  >
                    <span
                      className={`ease-mola grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-[-8deg] ${
                        i === 0 ? "bg-fundo/15" : "bg-roxo/20 text-roxo-claro"
                      }`}
                    >
                      <Icone nome={acao.icone} width={17} height={17} />
                    </span>
                    {acao.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {aneis.length > 0 && (
        <section aria-labelledby="titulo-seu-dia" className="vidro relative rounded-[1.75rem] p-5">
          <h2
            id="titulo-seu-dia"
            className="text-apagado mb-4 text-[0.7rem] font-bold tracking-[0.16em] uppercase"
          >
            Seu dia em números
          </h2>
          <ul className={`grid gap-4 ${aneis.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {aneis.map((anel) => (
              <li key={anel.titulo} className="flex flex-col items-center gap-2 text-center">
                <Anel
                  fracao={anel.fracao}
                  tom={anel.tom}
                  tamanho={80}
                  espessura={9}
                  rotulo={`${anel.titulo}: ${anel.detalhe}`}
                >
                  <span className="text-lg font-extrabold tabular-nums">{anel.centro}</span>
                </Anel>
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{anel.titulo}</span>
                  <span className="text-apagado text-xs">{anel.detalhe}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </header>
  );
}
