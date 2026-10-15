import { Selo } from "@/components/base/selo";
import { SITUACOES, type Situacao } from "@/lib/mensalidades/formatacao";
import { TOM_DA_SITUACAO } from "@/lib/mensalidades/painel";

/** Situação da mensalidade em selo: ponto colorido e o nome (nunca só a cor). */
export function SeloDaSituacao({
  situacao,
  className = "",
}: {
  situacao: Situacao;
  className?: string;
}) {
  return (
    <Selo tom={TOM_DA_SITUACAO[situacao]} className={className}>
      {SITUACOES[situacao]}
    </Selo>
  );
}
