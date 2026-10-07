import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { SeletorDeMes } from "@/components/aulas/seletor-de-mes";
import { Avatar } from "@/components/base/avatar";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Cartao, CabecalhoCartao } from "@/components/base/cartao";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { SeloIcone } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { Icone, type NomeIcone } from "@/components/icones";
import { AcessoNegado, Aviso } from "@/components/ui";
import { proporcoes } from "@/lib/custos/formatacao";
import type { ResultadoDoMes, Valores } from "@/lib/custos/tipos";
import { formatarPorcentagem } from "@/lib/contabil/formatacao";
import { competenciaAtual, competenciaValida, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Resultado das aulas | Só Dois Toques" };

/** CUSTO-CA-05 a 07: receita, custo de quadra e resultado por turma e por professor. */
export default async function PaginaResultado({ searchParams }: PageProps<"/aulas/resultado">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { competencia: pedida } = await searchParams;
  const competencia =
    typeof pedida === "string" && competenciaValida(pedida) ? pedida : competenciaAtual();
  const resposta = await chamarApi<ResultadoDoMes>(`/custos/resultado?competencia=${competencia}`);

  return (
    <>
      <Cabecalho
        etiqueta="Aulas"
        icone="contabil"
        titulo={
          <>
            Resultado das <Destaque>aulas</Destaque>
          </>
        }
        descricao="Pelo que entrou e saiu do Caixa no mês. A mensalidade de quem está em mais de uma turma é dividida em partes iguais; o custo de cada quadra, pelas horas de cada turma."
        acoes={<SeletorDeMes competencia={competencia} caminho="/aulas/resultado" />}
      />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <>
          <Totais totais={resposta.dados.totais} />
          <Tabela
            titulo="Por turma"
            icone="aulas"
            linhas={[
              ...resposta.dados.turmas.map((t) => ({
                chave: t.id,
                nome: t.nome,
                detalhe: `${t.local} · ${t.professor.nome}`,
                valores: t,
              })),
              ...(resposta.dados.semTurma.receitaCentavos !== 0 ||
              resposta.dados.semTurma.custoCentavos !== 0
                ? [
                    {
                      chave: "sem-turma",
                      nome: "Sem turma",
                      detalhe: "Aluno sem matrícula no mês ou quadra sem turma com horas",
                      valores: resposta.dados.semTurma,
                    },
                  ]
                : []),
            ]}
          />
          <Tabela
            titulo="Por professor"
            icone="usuarios"
            comAvatar
            linhas={resposta.dados.professores.map((p) => ({
              chave: p.id,
              nome: p.nome,
              detalhe: `${p.turmas} ${p.turmas === 1 ? "turma" : "turmas"}`,
              valores: p,
            }))}
          />
        </>
      )}
    </>
  );
}

function Total({
  rotulo,
  icone,
  tom,
  valor,
  nota,
  destaque = false,
  children,
}: {
  rotulo: string;
  icone: NomeIcone;
  tom: "roxo" | "ouro" | "sucesso" | "perigo";
  valor: number;
  nota?: string;
  destaque?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-[1.6rem] p-5 ${destaque ? "superficie-destaque" : "superficie"}`}
    >
      <span className="flex items-center gap-2.5">
        <SeloIcone nome={icone} tom={tom} tamanho="p" />
        <span className="text-suave text-sm font-semibold">{rotulo}</span>
      </span>
      <NumeroAnimado
        valor={valor}
        centavosMenores
        className={`text-[1.75rem] leading-none font-extrabold tracking-tight ${valor < 0 ? "text-perigo" : ""}`}
      />
      {children}
      {nota && <span className="text-apagado text-xs">{nota}</span>}
    </div>
  );
}

/** Destaque da tela: o resultado do mês, com a parte da receita que ficou depois do custo. */
function Totais({ totais }: { totais: Valores }) {
  const margem =
    totais.receitaCentavos > 0 ? (totais.resultadoCentavos / totais.receitaCentavos) * 100 : null;
  const [receita, custo] = proporcoes([totais.receitaCentavos, totais.custoCentavos]);
  return (
    <section
      aria-label="Totais do mês"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]"
    >
      <Total
        rotulo="Receita de mensalidades"
        icone="subir"
        tom="roxo"
        valor={totais.receitaCentavos}
        nota="Mensalidades pagas no Caixa"
      />
      <Total
        rotulo="Custo de quadras"
        icone="descer"
        tom="ouro"
        valor={totais.custoCentavos}
        nota="Pagamentos às quadras parceiras"
      />
      <div className="sm:col-span-2 xl:col-span-1">
        <Total
          rotulo="Resultado"
          icone="contabil"
          tom={totais.resultadoCentavos < 0 ? "perigo" : "sucesso"}
          valor={totais.resultadoCentavos}
          destaque
          nota={
            margem === null
              ? "Sem receita de mensalidades no mês."
              : margem < 0
                ? "O custo das quadras passou a receita do mês."
                : `Sobram ${formatarPorcentagem(margem)} da receita depois das quadras.`
          }
        >
          <Comparacao receita={receita ?? 0} custo={custo ?? 0} valores={totais} alto />
        </Total>
      </div>
    </section>
  );
}

/** Duas barras finas, receita (roxo) sobre custo (dourado), na mesma escala da tabela. */
function Comparacao({
  receita,
  custo,
  valores,
  alto = false,
}: {
  receita: number;
  custo: number;
  valores: Valores;
  alto?: boolean;
}) {
  const altura = alto ? "h-2.5" : "h-1.5";
  return (
    <span
      role="img"
      aria-label={`Receita ${formatarReais(valores.receitaCentavos)} e custo ${formatarReais(valores.custoCentavos)}`}
      className="flex w-full flex-col gap-1"
    >
      {[
        { fracao: receita, classe: "fill-roxo" },
        { fracao: custo, classe: "fill-ouro" },
      ].map((b, i) => (
        <svg key={i} aria-hidden="true" className={`w-full ${altura}`} preserveAspectRatio="none">
          <rect width="100%" height="100%" rx="4" className="fill-elevado" />
          {b.fracao > 0 && (
            <rect
              width={`${b.fracao * 100}%`}
              height="100%"
              rx="4"
              className={`animate-crescer-x origem-esquerda ${b.classe} ${i === 1 ? "[animation-delay:120ms]" : ""}`}
            />
          )}
        </svg>
      ))}
    </span>
  );
}

type Linha = { chave: string; nome: string; detalhe: string; valores: Valores };

function Tabela({
  titulo,
  icone,
  linhas,
  comAvatar = false,
}: {
  titulo: string;
  icone: NomeIcone;
  linhas: Linha[];
  comAvatar?: boolean;
}) {
  const escala = proporcoes(
    linhas.flatMap((l) => [l.valores.receitaCentavos, l.valores.custoCentavos]),
  );
  const id = `titulo-${titulo.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <Cartao aria-labelledby={id} className="flex flex-col gap-4">
      <CabecalhoCartao
        id={id}
        icone={icone}
        titulo={titulo}
        descricao={
          linhas.length > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-roxo size-2 rounded-full" aria-hidden="true" /> Receita
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-ouro size-2 rounded-full" aria-hidden="true" /> Custo
              </span>
            </span>
          ) : undefined
        }
      />
      {linhas.length === 0 ? (
        <Vazio compacto titulo="Nada neste mês." />
      ) : (
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[34rem] text-left text-sm" aria-label={titulo}>
            <thead>
              <tr className="border-borda border-b">
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 text-right">Receita</th>
                <th className="py-2 text-right">Custo</th>
                <th className="py-2 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr
                  key={l.chave}
                  className="border-borda hover:bg-elevado/40 border-b transition-colors last:border-b-0"
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-3">
                      {comAvatar && <Avatar nome={l.nome} tamanho="p" />}
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex flex-col">
                          <span className="font-semibold">{l.nome}</span>
                          <span className="text-apagado text-xs">{l.detalhe}</span>
                        </span>
                        <span className="max-w-56">
                          <Comparacao
                            receita={escala[i * 2] ?? 0}
                            custo={escala[i * 2 + 1] ?? 0}
                            valores={l.valores}
                          />
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatarReais(l.valores.receitaCentavos)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatarReais(l.valores.custoCentavos)}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold tabular-nums ${
                        l.valores.resultadoCentavos < 0
                          ? "bg-perigo/12 text-perigo"
                          : "bg-sucesso/12 text-sucesso"
                      }`}
                    >
                      <Icone
                        nome={l.valores.resultadoCentavos < 0 ? "descer" : "subir"}
                        width={13}
                        height={13}
                        strokeWidth={2.4}
                      />
                      {formatarReais(l.valores.resultadoCentavos)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  );
}
