import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { estornarPagamentoQuadra } from "@/app/acoes/custos";
import { FormPagamentoQuadra } from "@/components/custos/form-pagamento-quadra";
import { FormValorHora } from "@/components/custos/form-valor-hora";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { AcessoNegado, Aviso, classeBotaoSecundario } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { formatarHoras } from "@/lib/custos/formatacao";
import type { CustoDoLocal, CustosDoMes } from "@/lib/custos/tipos";
import {
  competenciaAtual,
  competenciaValida,
  deslocarMes,
  FORMAS,
  formatarReais,
  nomeDoMes,
} from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Custos das quadras | Só Dois Toques" };

/** CUSTO-CA-01 a 04: valor da hora, horas do mês, previsto e pagamentos às quadras. */
export default async function PaginaCustos({ searchParams }: PageProps<"/aulas/custos">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { competencia: pedida } = await searchParams;
  const competencia =
    typeof pedida === "string" && competenciaValida(pedida) ? pedida : competenciaAtual();
  const resposta = await chamarApi<CustosDoMes>(`/custos?competencia=${competencia}`);
  const link = (mes: string) => `/aulas/custos?competencia=${mes}`;

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Custos das quadras em {nomeDoMes(competencia)}</h1>
        <p className="opacity-80">
          Horas de aula de cada quadra parceira no mês e o custo previsto pelo valor da hora. O que
          você paga sai do Caixa.
        </p>
        <nav aria-label="Mês" className="flex flex-wrap gap-2">
          <Link href={link(deslocarMes(competencia, -1))} className={classeBotaoSecundario}>
            ← {nomeDoMes(deslocarMes(competencia, -1))}
          </Link>
          <Link href={link(deslocarMes(competencia, 1))} className={classeBotaoSecundario}>
            {nomeDoMes(deslocarMes(competencia, 1))} →
          </Link>
        </nav>
      </header>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.locais.length === 0 ? (
        <p className="opacity-80">
          Nenhuma quadra parceira cadastrada. Cadastre em{" "}
          <Link href="/aulas/locais" className="underline">
            Locais
          </Link>
          .
        </p>
      ) : (
        <>
          <section aria-label="Totais do mês" className="grid gap-3 sm:grid-cols-3">
            <Total rotulo="Horas de aula" valor={formatarHoras(resposta.dados.totais.minutos)} />
            <Total
              rotulo="Custo previsto"
              valor={formatarReais(resposta.dados.totais.previstoCentavos)}
            />
            <Total rotulo="Pago" valor={formatarReais(resposta.dados.totais.pagoCentavos)} />
          </section>
          <ul className="flex flex-col gap-4" aria-label="Quadras parceiras">
            {resposta.dados.locais.map((local) => (
              <Local key={local.id} local={local} competencia={competencia} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Local({ local, competencia }: { local: CustoDoLocal; competencia: string }) {
  const diferenca =
    local.previstoCentavos === null ? null : local.previstoCentavos - local.pagoCentavos;
  return (
    <li
      className={`flex flex-col gap-4 rounded-lg border border-current/15 p-4 ${local.ativo ? "" : "opacity-80"}`}
      aria-label={local.nome}
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">
          {local.nome}
          {local.ativo ? "" : " (inativo)"}
        </h2>
        <p className="text-sm opacity-80" data-testid="resumo-local">
          {formatarHoras(local.minutos)} de aula · previsto{" "}
          {local.previstoCentavos === null
            ? "sem valor da hora"
            : formatarReais(local.previstoCentavos)}{" "}
          · pago {formatarReais(local.pagoCentavos)}
          {diferenca !== null && diferenca > 0 && ` · falta ${formatarReais(diferenca)}`}
        </p>
      </header>
      <FormValorHora localId={local.id} valorHoraCentavos={local.valorHoraCentavos} />
      {local.turmas.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Turmas no mês</h3>
          <ul className="text-sm">
            {local.turmas.map((t) => (
              <li key={t.id}>
                <Link href={`/aulas/turmas/${t.id}`} className="underline">
                  {t.nome}
                </Link>{" "}
                · {formatarHoras(t.minutos)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {local.pagamentos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Pagamentos de {nomeDoMes(competencia)}</h3>
          <ul className="flex flex-col gap-2" aria-label={`Pagamentos a ${local.nome}`}>
            {local.pagamentos.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-md border border-current/10 p-3"
              >
                <p className={p.estornadoEm ? "line-through opacity-70" : ""}>
                  {formatarReais(p.valorCentavos)} · {FORMAS[p.forma]} · {formatarData(p.data)} ·
                  pago por {p.pagoPor}
                </p>
                {p.estornadoEm ? (
                  <Aviso tipo="info">
                    Estornado em {formatarDataHora(p.estornadoEm)}. Motivo: {p.motivoEstorno}
                  </Aviso>
                ) : (
                  <details>
                    <summary className="cursor-pointer text-sm underline">Estornar</summary>
                    <div className="pt-2">
                      <FormMotivo
                        acao={estornarPagamentoQuadra}
                        campos={{ pagamentoId: p.id }}
                        titulo="Estornar pagamento à quadra"
                        explicacao="Lança uma entrada de mesmo valor no Caixa. O pagamento continua no histórico."
                        rotulo="Estornar pagamento"
                        idCampo={`motivo-estorno-${p.id}`}
                      />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <FormPagamentoQuadra
        localId={local.id}
        localNome={local.nome}
        competencia={competencia}
        sugeridoCentavos={diferenca !== null && diferenca > 0 ? diferenca : null}
        hoje={hojeEmSaoPaulo()}
      />
    </li>
  );
}

function Total({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-current/15 p-4">
      <p className="text-sm opacity-80">{rotulo}</p>
      <p className="text-xl font-semibold">{valor}</p>
    </div>
  );
}
