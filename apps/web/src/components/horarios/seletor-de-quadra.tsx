import { Icone } from "@/components/icones";
import { classeCampo, classeRotulo } from "@/components/ui";
import type { Quadra } from "@/lib/horarios/tipos";

/**
 * GASTO-CA-02: escolha da quadra nos formulários (turma, bloqueio, contrato, locação).
 * Sem escolha anterior, vem marcada a primeira (a principal, cadastrada antes).
 */
export function SeletorDeQuadra({
  quadras,
  padrao,
  id = "quadraId",
  className = "",
}: {
  quadras: readonly Quadra[];
  padrao?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={classeRotulo}>
        Quadra
      </label>
      <div className="relative">
        <Icone
          nome="areia"
          width={18}
          height={18}
          className="text-apagado pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
        />
        <select
          id={id}
          name="quadraId"
          required
          className={`${classeCampo} pl-11`}
          defaultValue={padrao ?? quadras[0]?.id ?? ""}
        >
          {quadras.length === 0 && <option value="">Nenhuma quadra ativa</option>}
          {quadras.map((q) => (
            <option key={q.id} value={q.id}>
              {q.nome}
              {q.ativa ? "" : " (desativada)"}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
