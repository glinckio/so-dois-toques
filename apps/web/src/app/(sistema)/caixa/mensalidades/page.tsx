import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { gerarMensalidades } from "@/app/acoes/mensalidades";
import { BotaoAcao } from "@/components/botao-acao";
import { Aviso, classeBotao, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { formatarData } from "@/lib/aulas/formatacao";
import {
  competenciaAtual,
  competenciaValida,
  deslocarMes,
  formatarReais,
  nomeDoMes,
  SITUACOES,
  type Situacao,
} from "@/lib/mensalidades/formatacao";
import type { ListaMensalidades } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Mensalidades | Só Dois Toques" };

const CORES: Record<Situacao, string> = {
  EM_ABERTO: "border-borda",
  ATRASADA: "border-perigo/50 bg-perigo/10",
  PAGA: "border-sucesso/50 bg-sucesso/10",
  CANCELADA: "border-borda text-apagado",
};

/** MENS-CA-15: mensalidades do mês, com filtros e totais. */
export default async function PaginaMensalidades({
  searchParams,
}: PageProps<"/caixa/mensalidades">) {
  await connection();
  const { usuario } = await exigirArea("caixa");
  const parametros = await searchParams;
  const pedida = typeof parametros.competencia === "string" ? parametros.competencia : undefined;
  const competencia = competenciaValida(pedida) ? pedida : competenciaAtual();
  const situacao =
    typeof parametros.situacao === "string" && parametros.situacao in SITUACOES
      ? (parametros.situacao as Situacao)
      : undefined;
  const busca = typeof parametros.busca === "string" ? parametros.busca.slice(0, 120) : "";
  const consulta = new URLSearchParams({ competencia });
  if (situacao) consulta.set("situacao", situacao);
  if (busca.trim()) consulta.set("busca", busca.trim());
  const resposta = await chamarApi<ListaMensalidades>(`/mensalidades?${consulta}`);
  const admin = usuario.perfil === "ADMINISTRADOR";
  const link = (mes: string) => `/caixa/mensalidades?competencia=${mes}`;

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Mensalidades de {nomeDoMes(competencia)}</h1>
        <nav aria-label="Mês" className="flex flex-wrap gap-2">
          <Link href={link(deslocarMes(competencia, -1))} className={classeBotaoSecundario}>
            ← {nomeDoMes(deslocarMes(competencia, -1))}
          </Link>
          <Link href={link(deslocarMes(competencia, 1))} className={classeBotaoSecundario}>
            {nomeDoMes(deslocarMes(competencia, 1))} →
          </Link>
        </nav>
      </header>

      {admin && (
        <BotaoAcao
          acao={gerarMensalidades}
          campos={{ competencia }}
          rotulo={`Gerar mensalidades de ${nomeDoMes(competencia)}`}
          className={`${classeBotao} self-start`}
        />
      )}

      <form action="/caixa/mensalidades" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="competencia" value={competencia} />
        <div className="flex flex-col gap-1">
          <label htmlFor="busca" className="text-sm font-medium">
            Aluno
          </label>
          <input
            id="busca"
            name="busca"
            type="search"
            defaultValue={busca}
            className={classeCampo}
            placeholder="Nome do aluno"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="situacao" className="text-sm font-medium">
            Situação
          </label>
          <select
            id="situacao"
            name="situacao"
            defaultValue={situacao ?? ""}
            className={classeCampo}
          >
            <option value="">Todas</option>
            {Object.entries(SITUACOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={classeBotaoSecundario}>
          Filtrar
        </button>
      </form>

      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <>
          <section aria-label="Totais do mês" className="grid gap-3 sm:grid-cols-3">
            <Total rotulo="Previsto" valor={resposta.dados.totais.previsto} />
            <Total rotulo="Recebido" valor={resposta.dados.totais.recebido} />
            <Total rotulo="Em aberto" valor={resposta.dados.totais.emAberto} />
          </section>
          {resposta.dados.itens.length === 0 ? (
            <p className="text-suave">
              Nenhuma mensalidade
              {situacao || busca ? " com esse filtro" : " gerada neste mês"}.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Mensalidades">
              {resposta.dados.itens.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/caixa/mensalidades/${m.id}`}
                    className={`hover:bg-elevado flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${CORES[m.situacao]}`}
                  >
                    <span>
                      <span className="font-medium">{m.aluno.nome}</span>
                      <span className="text-suave block text-sm">
                        Vence em {formatarData(m.vencimento)}
                        {m.pagamento ? ` · pago em ${formatarData(m.pagamento.data)}` : ""}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-medium">{formatarReais(m.valorCentavos)}</span>
                      <span className="text-sm">{SITUACOES[m.situacao]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function Total({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="border-borda bg-cartao rounded-2xl border p-4">
      <p className="text-suave text-sm">{rotulo}</p>
      <p className="text-xl font-semibold">{formatarReais(valor)}</p>
    </div>
  );
}
