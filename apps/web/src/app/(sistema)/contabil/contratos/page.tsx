import type { Metadata } from "next";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Selo } from "@/components/base/selo";
import { FormContrato, FormEncerrarContrato } from "@/components/contabil/form-contrato";
import { AcessoNegado, Aviso, classeCartao } from "@/components/ui";
import type { Contrato } from "@/lib/contabil/tipos";
import type { Quadra } from "@/lib/horarios/tipos";
import { competenciaAtual, FORMAS, formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Aluguel mensal | Só Dois Toques" };

/**
 * GASTO-CA-03 e 04: os horários de quadra pagos por mês. O aluguel sai do caixa sozinho
 * no dia do pagamento; mudar o valor é encerrar e registrar outro.
 */
export default async function PaginaContratos() {
  await connection();
  const { permitido } = await exigirArea("contabil");
  if (!permitido) return <AcessoNegado />;
  const [contratos, quadras] = await Promise.all([
    chamarApi<Contrato[]>("/gastos/contratos"),
    chamarApi<Quadra[]>("/horarios/quadras"),
  ]);
  const mesAtual = competenciaAtual();

  return (
    <>
      <Cabecalho
        etiqueta="Contábil"
        icone="contabil"
        titulo={
          <>
            Aluguel <Destaque>mensal</Destaque> de quadra
          </>
        }
        descricao="Tal dia e horário, na quadra X, R$ Y por mês. O aluguel sai do caixa sozinho no dia do pagamento."
      />

      <section aria-labelledby="titulo-novo-contrato" className={classeCartao}>
        <h2 id="titulo-novo-contrato" className="mb-4 text-lg font-bold">
          Novo contrato
        </h2>
        {quadras.ok ? (
          <FormContrato quadras={quadras.dados.filter((q) => q.ativa)} mesAtual={mesAtual} />
        ) : (
          <Aviso tipo="erro">{quadras.mensagem}</Aviso>
        )}
      </section>

      <section aria-labelledby="titulo-contratos" className="flex flex-col gap-3">
        <h2 id="titulo-contratos" className="px-1 text-lg font-bold">
          Contratos
        </h2>
        {!contratos.ok ? (
          <Aviso tipo="erro">{contratos.mensagem}</Aviso>
        ) : contratos.dados.length === 0 ? (
          <p className="text-apagado px-1 text-sm">Nenhum contrato registrado.</p>
        ) : (
          <ul aria-label="Contratos" className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {contratos.dados.map((c) => (
              <li key={c.id} className={`${classeCartao} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-bold">{c.quadra.nome}</p>
                    <p className="text-suave text-sm">{c.horario}</p>
                    <p className="text-apagado text-sm">
                      Paga todo dia {c.diaPagamento} · {FORMAS[c.forma]} · desde{" "}
                      {nomeDoMes(c.inicio)}
                      {c.fim && ` · sem aluguel a partir de ${nomeDoMes(c.fim)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-lg font-extrabold tabular-nums">
                      {formatarReais(c.valorCentavos)}
                      <span className="text-apagado text-xs font-semibold">/mês</span>
                    </p>
                    <Selo tom={c.fim ? "neutro" : "sucesso"}>
                      {c.fim ? (c.vigente ? "Encerrando" : "Encerrado") : "Vigente"}
                    </Selo>
                  </div>
                </div>
                {!c.fim && (
                  <details className="group">
                    <summary className="text-suave hover:text-texto inline-flex min-h-10 items-center text-sm font-semibold">
                      Encerrar contrato
                    </summary>
                    <div className="animate-entrar pt-2">
                      <FormEncerrarContrato contratoId={c.id} mesAtual={mesAtual} />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
