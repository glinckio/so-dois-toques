import { BarraNivel } from "@/components/base/barra";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { SeloIcone, type Tom } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import type { NomeIcone } from "@/components/icones";
import { formasDePagamento, percentual } from "@/lib/caixa/painel";
import type { Forma } from "@/lib/mensalidades/formatacao";

type LinhaResumo = { entradas: number; saidas: number; saldo: number };

/** Entradas, saídas e saldo em números grandes que sobem ao abrir (centavos menores). */
export function NumerosDoDia({ resumo }: { resumo: LinhaResumo }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Numero rotulo="Entradas" icone="entrada" tom="sucesso" valor={resumo.entradas} />
      <Numero rotulo="Saídas" icone="saida" tom="perigo" valor={resumo.saidas} />
      <Numero rotulo="Saldo" icone="caixa" tom="roxo" valor={resumo.saldo} destaque />
    </div>
  );
}

function Numero({
  rotulo,
  icone,
  tom,
  valor,
  destaque = false,
}: {
  rotulo: string;
  icone: NomeIcone;
  tom: Tom;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-3 rounded-[1.6rem] p-4 sm:p-5 ${destaque ? "superficie-destaque col-span-2 sm:col-span-1" : "superficie"}`}
    >
      <span className="flex items-center gap-2.5">
        <SeloIcone nome={icone} tom={tom} tamanho="p" />
        <span className="text-suave text-sm font-semibold">{rotulo}</span>
      </span>
      <NumeroAnimado
        valor={valor}
        centavosMenores
        className={`leading-none font-extrabold tracking-tight break-words ${destaque ? "text-[1.85rem]" : "text-2xl sm:text-[1.85rem]"} ${valor < 0 ? "text-perigo" : ""}`}
      />
    </div>
  );
}

/**
 * Um bloco com ícone para cada forma de pagamento: o saldo, o que entrou e saiu e a
 * barra da parte daquela forma nas entradas (com o mesmo em texto, VIVO-CA-12). Com
 * espaço, o bloco vira uma linha (ícone, nome e saldo lado a lado); estreito, empilha.
 */
export function BlocosDasFormas({
  porForma,
  rotulo,
}: {
  porForma: Record<Forma, LinhaResumo>;
  rotulo: string;
}) {
  const formas = formasDePagamento(porForma);
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={rotulo}>
      {formas.map((f, i) => {
        const tom = f.forma === "DINHEIRO" ? "sucesso" : f.forma === "PIX" ? "roxo" : "areia";
        return (
          <li
            key={f.forma}
            className={`border-borda bg-elevado/35 animate-entrar @container rounded-[1.4rem] border p-4 atraso-${i * 2 + 2}`}
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-3 @[15rem]:grid-cols-[auto_minmax(0,1fr)_auto]">
              <SeloIcone nome={ICONES_DAS_FORMAS[f.forma] ?? "dinheiro"} tom={tom} tamanho="p" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm leading-tight font-semibold">{f.rotulo}</span>
                <span className="text-apagado flex flex-wrap gap-x-2.5 text-xs tabular-nums">
                  <span>
                    <span className="text-sucesso print:text-black">+</span>{" "}
                    <Valor centavos={f.entradas} />
                  </span>
                  <span>
                    <span className="text-perigo print:text-black">−</span>{" "}
                    <Valor centavos={f.saidas} />
                  </span>
                </span>
              </span>
              <Valor
                centavos={f.saldo}
                className={`col-span-2 text-xl leading-none font-extrabold @[15rem]:col-span-1 @[15rem]:text-right ${f.saldo < 0 ? "text-perigo" : ""}`}
              />
              <div className="col-span-full">
                <BarraNivel
                  fracao={f.fracao}
                  tom={tom}
                  altura="h-1.5"
                  rotulo={`${f.rotulo}: ${percentual(f.fracao)}% das entradas`}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
