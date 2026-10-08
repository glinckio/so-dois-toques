import Link from "next/link";
import { Icone } from "@/components/icones";
import { classeBotaoIcone } from "@/components/ui";
import { competenciaAtual, deslocarMes, nomeDoMes } from "@/lib/mensalidades/formatacao";

/** Mês da tela numa pílula, com botões redondos para o mês anterior e o seguinte. */
export function SeletorDeMes({
  competencia,
  caminho,
}: {
  competencia: string;
  /** Página que recebe `?competencia=`. */
  caminho: string;
}) {
  const anterior = deslocarMes(competencia, -1);
  const seguinte = deslocarMes(competencia, 1);
  const atual = competenciaAtual();
  const link = (mes: string) => `${caminho}?competencia=${mes}`;
  return (
    <nav aria-label="Mês" className="flex flex-wrap items-center gap-2">
      <Link href={link(anterior)} className={classeBotaoIcone}>
        <Icone nome="anterior" width={18} height={18} />
        <span className="sr-only">Mês anterior ({nomeDoMes(anterior)})</span>
      </Link>
      <span
        className="superficie inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold first-letter:uppercase"
        aria-current="date"
      >
        <Icone nome="calendario" width={16} height={16} className="text-ouro" />
        <span className="first-letter:uppercase">{nomeDoMes(competencia)}</span>
      </span>
      <Link href={link(seguinte)} className={classeBotaoIcone}>
        <Icone nome="proximo" width={18} height={18} />
        <span className="sr-only">Mês seguinte ({nomeDoMes(seguinte)})</span>
      </Link>
      {competencia !== atual && (
        <Link
          href={link(atual)}
          className="text-ouro hover:bg-ouro/10 rounded-full px-3 py-2 text-sm font-semibold"
        >
          Este mês
        </Link>
      )}
    </nav>
  );
}
