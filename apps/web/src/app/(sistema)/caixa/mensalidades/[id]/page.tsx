import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { cancelarMensalidade, estornarPagamento } from "@/app/acoes/mensalidades";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { FormPagamento } from "@/components/mensalidades/form-pagamento";
import { Aviso } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { FORMAS, formatarReais, nomeDoMes, SITUACOES } from "@/lib/mensalidades/formatacao";
import type { MensalidadeDetalhe } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Mensalidade | Só Dois Toques" };

export default async function PaginaMensalidade({ params }: PageProps<"/caixa/mensalidades/[id]">) {
  await connection();
  const { usuario } = await exigirArea("caixa");
  const { id } = await params;
  const resposta = await chamarApi<MensalidadeDetalhe>(`/mensalidades/${encodeURIComponent(id)}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const m = resposta.dados;
  const admin = usuario.perfil === "ADMINISTRADOR";
  const devida = m.situacao === "EM_ABERTO" || m.situacao === "ATRASADA";

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">{m.aluno.nome}</h1>
        <p className="opacity-80">
          Mensalidade de {nomeDoMes(m.competencia)} · {formatarReais(m.valorCentavos)} · vence em{" "}
          {formatarData(m.vencimento)}
        </p>
        <p className="mt-1 font-medium" data-testid="situacao">
          {SITUACOES[m.situacao]}
        </p>
      </header>
      {m.cancelamento && (
        <Aviso tipo="info">
          Cancelada em {formatarDataHora(m.cancelamento.em)}. Motivo: {m.cancelamento.motivo}
        </Aviso>
      )}

      {devida && (
        <FormPagamento
          mensalidadeId={m.id}
          valorCentavos={m.valorCentavos}
          hoje={hojeEmSaoPaulo()}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Pagamentos</h2>
        {m.pagamentos.length === 0 ? (
          <p className="opacity-80">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Pagamentos">
            {m.pagamentos.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-current/15 p-3"
              >
                <p>
                  <span className="font-medium">Recibo nº {p.numeroRecibo}</span> ·{" "}
                  {formatarReais(p.valorCentavos)} · {FORMAS[p.forma]} · {formatarData(p.data)} ·
                  recebido por {p.recebidoPor}
                </p>
                <Link href={`/caixa/recibos/${p.id}`} className="self-start underline">
                  Ver recibo
                </Link>
                {p.estorno ? (
                  <Aviso tipo="info">
                    Estornado em {formatarDataHora(p.estorno.em)}. Motivo: {p.estorno.motivo}
                  </Aviso>
                ) : (
                  admin && (
                    <FormMotivo
                      acao={estornarPagamento}
                      campos={{ pagamentoId: p.id }}
                      titulo="Estornar pagamento"
                      explicacao="Lança uma saída de mesmo valor no Caixa e a mensalidade volta a ficar devida. O pagamento continua no histórico."
                      rotulo="Estornar pagamento"
                      idCampo={`motivo-estorno-${p.id}`}
                    />
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {admin && devida && (
        <FormMotivo
          acao={cancelarMensalidade}
          campos={{ mensalidadeId: m.id }}
          titulo="Cancelar mensalidade"
          explicacao="Use quando a mensalidade não deve ser cobrada (por exemplo, combinado com o aluno). Não mexe no Caixa."
          rotulo="Cancelar mensalidade"
          idCampo="motivo-cancelamento"
        />
      )}
    </>
  );
}
