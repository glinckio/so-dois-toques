import type { Metadata } from "next";
import { connection } from "next/server";
import { removerFaixa } from "@/app/acoes/horarios";
import { BotaoAcao } from "@/components/botao-acao";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { CabecalhoCartao } from "@/components/base/cartao";
import { FormFaixa } from "@/components/horarios/form-faixa";
import { FormQuadra } from "@/components/horarios/form-quadra";
import { COR_DO_NIVEL, LinhaDoDia, ReguaDoDia } from "@/components/horarios/linha-do-dia";
import { Aviso, classeCartao } from "@/components/ui";
import { DIAS_SEMANA } from "@/lib/aulas/formatacao";
import { faixaDeHoras } from "@/lib/horarios/formatacao";
import { faixasDoDia, horasAbertasNoDia, nivelDoPreco } from "@/lib/horarios/precos";
import type { Faixa, Quadra } from "@/lib/horarios/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Preços e quadras | Só Dois Toques" };

const classeRemover =
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-apagado transition hover:bg-perigo/10 hover:text-perigo active:scale-[0.97] disabled:opacity-55";

/**
 * HOR-CA-01: horário de funcionamento e preço da hora por dia, desenhados como faixas
 * na linha das 24 horas de cada dia da semana; nome das quadras.
 */
export default async function PaginaFaixas() {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const [faixas, quadras] = await Promise.all([
    chamarApi<Faixa[]>("/horarios/faixas"),
    chamarApi<Quadra[]>("/horarios/quadras"),
  ]);
  const precos = faixas.ok ? faixas.dados.map((f) => f.valorHoraCentavos) : [];
  const horasNaSemana = faixas.ok ? horasAbertasNoDia(faixas.dados) : 0;
  return (
    <>
      <Cabecalho
        etiqueta="Quadras de areia"
        icone="horarios"
        titulo={
          <>
            Preços e <Destaque>quadras</Destaque>
          </>
        }
        descricao="As faixas definem quando as quadras funcionam e quanto custa cada hora. Mudar uma faixa não muda reservas já feitas."
      />
      {admin && <FormFaixa />}
      {!faixas.ok ? (
        <Aviso tipo="erro">{faixas.mensagem}</Aviso>
      ) : (
        <section aria-labelledby="titulo-semana" className={`${classeCartao} flex flex-col gap-4`}>
          <CabecalhoCartao
            id="titulo-semana"
            icone="calendario"
            tom="areia"
            titulo="Semana das quadras"
            descricao={`${horasNaSemana} horas abertas por quadra na semana`}
          />
          <div className="grid gap-x-4 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
            <div className="sm:col-start-2">
              <ReguaDoDia />
            </div>
          </div>
          <ul className="flex flex-col" aria-label="Faixas de preço">
            {DIAS_SEMANA.map((dia, i) => {
              const doDia = faixasDoDia(faixas.dados, i);
              const horas = horasAbertasNoDia(doDia);
              return (
                <li
                  key={dia}
                  className="border-borda/60 grid gap-x-4 gap-y-2 border-t py-3.5 first:border-t-0 sm:grid-cols-[6.5rem_minmax(0,1fr)]"
                >
                  <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:justify-start sm:gap-0.5">
                    <h2 className="font-bold">{dia}</h2>
                    {horas > 0 && (
                      <span className="text-apagado text-xs font-semibold">{horas} h abertas</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <LinhaDoDia faixas={doDia} todosOsPrecos={precos} atraso={i * 2} />
                    {doDia.map((f) => (
                      <div
                        key={f.id}
                        className="flex flex-wrap items-center justify-between gap-x-3"
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <span
                            aria-hidden="true"
                            className={`size-2.5 shrink-0 rounded-full ${COR_DO_NIVEL[nivelDoPreco(f.valorHoraCentavos, precos)]}`}
                          />
                          <span>
                            {faixaDeHoras(f.horaInicio, f.horaFim)} ·{" "}
                            <strong className="font-bold">
                              {formatarReais(f.valorHoraCentavos)}
                            </strong>{" "}
                            por hora
                          </span>
                        </span>
                        {admin && (
                          <BotaoAcao
                            acao={removerFaixa}
                            campos={{ faixaId: f.id }}
                            rotulo="Remover"
                            className={classeRemover}
                            confirmar="Remover esta faixa? Esse horário deixa de aceitar reservas."
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {admin && quadras.ok && (
        <section aria-labelledby="titulo-quadras" className={`${classeCartao} flex flex-col gap-5`}>
          <CabecalhoCartao
            id="titulo-quadras"
            icone="areia"
            tom="areia"
            titulo="Quadras"
            descricao="O nome aparece no cabeçalho da grade e nas reservas."
          />
          <div className="flex flex-col gap-4">
            {quadras.dados.map((q) => (
              <FormQuadra key={q.id} quadra={q} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
