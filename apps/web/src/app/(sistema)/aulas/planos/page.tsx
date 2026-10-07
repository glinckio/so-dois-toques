import type { Metadata } from "next";
import { connection } from "next/server";
import { BarraNivel } from "@/components/base/barra";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { Icone } from "@/components/icones";
import { FormPlano } from "@/components/mensalidades/form-plano";
import { AcessoNegado, Aviso } from "@/components/ui";
import { proporcoes } from "@/lib/custos/formatacao";
import { valorPorAula } from "@/lib/aulas/visual";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import type { Plano } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Planos | Só Dois Toques" };

/**
 * Planos como etiquetas de preço: o valor do mês em destaque, o valor aproximado
 * por aula e uma barra que compara quantos alunos cada plano tem.
 */
export default async function PaginaPlanos() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const resposta = await chamarApi<Plano[]>("/planos");
  const planos = resposta.ok ? resposta.dados : [];
  const partes = proporcoes(planos.map((p) => p.alunos));
  const maisProcurado = planos.reduce<Plano | null>(
    (melhor, p) => (p.ativo && p.alunos > 0 && (!melhor || p.alunos > melhor.alunos) ? p : melhor),
    null,
  );
  return (
    <>
      <Cabecalho
        etiqueta="Aulas"
        icone="recibo"
        titulo={
          <>
            Planos e <Destaque>mensalidades</Destaque>
          </>
        }
        descricao="Mudar o valor de um plano vale para as mensalidades geradas depois; as já geradas não mudam."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {!resposta.ok ? (
          <Aviso tipo="erro">{resposta.mensagem}</Aviso>
        ) : planos.length === 0 ? (
          <Vazio titulo="Nenhum plano cadastrado.">
            Cadastre os planos (por exemplo 1x ou 2x por semana) para gerar as mensalidades.
          </Vazio>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Planos">
            {planos.map((p, i) => {
              const porAula = valorPorAula(p.valorCentavos, p.aulasPorSemana);
              const destaque = maisProcurado?.id === p.id;
              return (
                <li
                  key={p.id}
                  className={`animate-entrar flex flex-col gap-4 rounded-[1.6rem] p-5 atraso-${Math.min(24, i)} ${
                    destaque ? "superficie-destaque" : "superficie"
                  } ${p.ativo ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <SeloIcone nome="recibo" tom={destaque ? "ouro" : "roxo"} />
                      <span className="truncate text-lg leading-tight font-bold">{p.nome}</span>
                    </span>
                    {destaque && (
                      <Selo tom="ouro">
                        <Icone nome="estrela" width={12} height={12} />
                        Mais alunos
                      </Selo>
                    )}
                    {!p.ativo && <Selo tom="neutro">inativo</Selo>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <Valor
                        centavos={p.valorCentavos}
                        className="text-3xl leading-none font-extrabold tracking-tight"
                      />{" "}
                      <span className="text-suave text-sm">por mês</span>
                    </p>
                    {porAula !== null && (
                      <p className="text-apagado text-xs">
                        cerca de {formatarReais(porAula)} por aula
                      </p>
                    )}
                  </div>
                  <p className="flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className="bg-elevado text-suave inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
                      <Icone nome="calendario" width={13} height={13} />
                      {p.aulasPorSemana}x por semana
                    </span>
                    <span className="bg-elevado text-suave inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
                      <Icone nome="usuarios" width={13} height={13} />
                      {p.alunos} {p.alunos === 1 ? "aluno" : "alunos"}
                    </span>
                  </p>
                  <BarraNivel
                    fracao={partes[i] ?? 0}
                    tom={destaque ? "ouro" : "roxo"}
                    altura="h-2"
                    rotulo={`${p.nome}: ${p.alunos} ${p.alunos === 1 ? "aluno" : "alunos"}${maisProcurado ? `, comparado ao plano com mais alunos (${maisProcurado.alunos})` : ""}`}
                  />
                  <details className="group border-borda border-t pt-3">
                    <summary className="text-roxo-claro hover:text-texto inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
                      <Icone nome="editar" width={15} height={15} />
                      Editar
                    </summary>
                    <div className="animate-entrar pt-3">
                      <FormPlano plano={p} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <div className="max-lg:order-first lg:sticky lg:top-6">
          <FormPlano />
        </div>
      </div>
    </>
  );
}
