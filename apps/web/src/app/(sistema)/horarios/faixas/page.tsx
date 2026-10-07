import type { Metadata } from "next";
import { connection } from "next/server";
import { removerFaixa } from "@/app/acoes/horarios";
import { BotaoAcao } from "@/components/botao-acao";
import { FormFaixa } from "@/components/horarios/form-faixa";
import { FormQuadra } from "@/components/horarios/form-quadra";
import { Aviso } from "@/components/ui";
import { DIAS_SEMANA } from "@/lib/aulas/formatacao";
import { faixaDeHoras } from "@/lib/horarios/formatacao";
import type { Faixa, Quadra } from "@/lib/horarios/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Preços e quadras | Só Dois Toques" };

/** HOR-CA-01: horário de funcionamento e preço da hora por dia; nome das quadras. */
export default async function PaginaFaixas() {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const [faixas, quadras] = await Promise.all([
    chamarApi<Faixa[]>("/horarios/faixas"),
    chamarApi<Quadra[]>("/horarios/quadras"),
  ]);
  return (
    <>
      <h1 className="text-2xl font-semibold">Preços e quadras</h1>
      <p className="opacity-80">
        As faixas definem quando as quadras funcionam e quanto custa cada hora. Mudar uma faixa não
        muda reservas já feitas.
      </p>
      {admin && <FormFaixa />}
      {!faixas.ok ? (
        <Aviso tipo="erro">{faixas.mensagem}</Aviso>
      ) : (
        <ul className="flex flex-col divide-y divide-current/10" aria-label="Faixas de preço">
          {DIAS_SEMANA.map((dia, i) => {
            const doDia = faixas.dados.filter((f) => f.diaSemana === i);
            return (
              <li key={dia} className="flex flex-col gap-2 py-3">
                <h2 className="font-medium">{dia}</h2>
                {doDia.length === 0 ? (
                  <p className="text-sm opacity-80">Fechado</p>
                ) : (
                  doDia.map((f) => (
                    <div key={f.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {faixaDeHoras(f.horaInicio, f.horaFim)} ·{" "}
                        {formatarReais(f.valorHoraCentavos)} por hora
                      </span>
                      {admin && (
                        <BotaoAcao
                          acao={removerFaixa}
                          campos={{ faixaId: f.id }}
                          rotulo="Remover"
                          confirmar="Remover esta faixa? Esse horário deixa de aceitar reservas."
                        />
                      )}
                    </div>
                  ))
                )}
              </li>
            );
          })}
        </ul>
      )}
      {admin && quadras.ok && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Quadras</h2>
          {quadras.dados.map((q) => (
            <FormQuadra key={q.id} quadra={q} />
          ))}
        </section>
      )}
    </>
  );
}
