import Link from "next/link";
import { Avatar } from "@/components/base/avatar";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { Vazio } from "@/components/base/vazio";
import { Aviso } from "@/components/ui";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import type { Inadimplentes } from "@/lib/mensalidades/tipos";
import type { RespostaApi } from "@/lib/servidor/api";

const MOSTRADOS = 5;

/**
 * FOCO-CA-10: mensalidades em atraso no Início. O total a receber sobe ao aparecer e
 * os alunos com o atraso mais antigo vêm primeiro, cada um levando às mensalidades dele.
 */
export function MensalidadesEmAtraso({ resposta }: { resposta: RespostaApi<Inadimplentes> }) {
  const cabecalho = (
    <CabecalhoCartao
      id="titulo-mensalidades-atrasadas"
      icone="mensalidades"
      tom="ouro"
      titulo="Mensalidades em atraso"
      acao={<LinkDoCartao href="/mensalidades/inadimplentes">Ver todas</LinkDoCartao>}
    />
  );
  if (!resposta.ok) {
    return (
      <Cartao aria-labelledby="titulo-mensalidades-atrasadas" className="flex flex-col gap-5">
        {cabecalho}
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      </Cartao>
    );
  }
  const { itens, totalCentavos } = resposta.dados;
  const primeiros = [...itens].sort((a, b) => b.diasDeAtraso - a.diasDeAtraso).slice(0, MOSTRADOS);
  return (
    <Cartao aria-labelledby="titulo-mensalidades-atrasadas" className="flex flex-col gap-5">
      {cabecalho}
      {itens.length === 0 ? (
        <Vazio compacto titulo="Ninguém em atraso.">
          Quando uma mensalidade passar do vencimento sem pagamento, o aluno aparece aqui.
        </Vazio>
      ) : (
        <>
          <p className="flex items-baseline gap-2" data-testid="atraso-total">
            <span className="text-3xl font-extrabold tracking-tight tabular-nums">
              <NumeroAnimado valor={totalCentavos} formato="reais" />
            </span>
            <span className="text-suave text-sm">
              de {itens.length} {itens.length === 1 ? "aluno" : "alunos"}
            </span>
          </p>
          <ul className="flex flex-col gap-1" aria-label="Alunos em atraso">
            {primeiros.map((i) => (
              <li key={i.aluno.id}>
                <Link
                  href={`/mensalidades?competencia=${i.vencimentoMaisAntigo.slice(0, 7)}&busca=${encodeURIComponent(i.aluno.nome)}`}
                  className="hover:bg-elevado/60 flex items-center gap-3 rounded-2xl p-2 transition-colors"
                >
                  <Avatar nome={i.aluno.nome} tamanho="p" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{i.aluno.nome}</span>
                    <span className="text-apagado text-xs">
                      {i.quantidade} {i.quantidade === 1 ? "mensalidade" : "mensalidades"} ·{" "}
                      {i.diasDeAtraso} {i.diasDeAtraso === 1 ? "dia" : "dias"} de atraso
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {formatarReais(i.totalCentavos)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Cartao>
  );
}
