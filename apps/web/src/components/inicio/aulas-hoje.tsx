import Link from "next/link";
import { Anel } from "@/components/base/anel";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { Selo } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { Icone } from "@/components/icones";
import { Aviso } from "@/components/ui";
import { horaDe, NIVEIS } from "@/lib/aulas/formatacao";
import { momentoDe, type TurmaDeHoje } from "@/lib/painel/inicio";

/**
 * Aulas de hoje em linha do tempo: o ponto da aula em andamento pulsa em dourado,
 * as que já passaram ficam apagadas com um "check" e cada turma mostra o quanto
 * das vagas está ocupado.
 */
export function AulasDeHoje({
  aulas,
  erro,
  minutoAtual,
}: {
  aulas: readonly TurmaDeHoje[];
  erro?: string;
  minutoAtual: number;
}) {
  return (
    <Cartao aria-labelledby="titulo-aulas-hoje" className="flex flex-col gap-5">
      <CabecalhoCartao
        id="titulo-aulas-hoje"
        icone="aulas"
        titulo="Aulas de hoje"
        descricao={
          erro
            ? undefined
            : aulas.length === 0
              ? "Dia livre de aulas"
              : `${aulas.length} ${aulas.length === 1 ? "aula" : "aulas"} na agenda`
        }
        acao={<LinkDoCartao href="/aulas">Ver as turmas</LinkDoCartao>}
      />
      {erro ? (
        <Aviso tipo="erro">{erro}</Aviso>
      ) : aulas.length === 0 ? (
        <Vazio compacto titulo="Nenhuma aula hoje.">
          As turmas com aula neste dia da semana aparecem aqui.
        </Vazio>
      ) : (
        <ol className="relative flex flex-col" aria-label="Aulas de hoje">
          {aulas.map(({ turma, inicio, fim }, i) => {
            const momento = momentoDe(inicio, fim, minutoAtual);
            const ultima = i === aulas.length - 1;
            return (
              <li
                key={`${turma.id}-${inicio}`}
                className={`animate-entrar grid grid-cols-[3.25rem_1.5rem_minmax(0,1fr)] gap-x-2 atraso-${Math.min(24, i * 2 + 2)}`}
              >
                <span
                  className={`pt-3 text-right text-sm leading-tight font-bold tabular-nums ${momento === "passou" ? "text-apagado" : ""}`}
                >
                  {horaDe(inicio)}
                  <span className="text-apagado block text-xs font-medium">{horaDe(fim)}</span>
                </span>
                <span className="relative flex justify-center" aria-hidden="true">
                  {!ultima && <span className="bg-borda absolute top-7 -bottom-1 w-px" />}
                  <span
                    className={`relative mt-3.5 grid size-4 place-items-center rounded-full ${
                      momento === "agora"
                        ? "bg-ouro text-ouro animate-pulsar"
                        : momento === "passou"
                          ? "bg-elevado text-apagado"
                          : "border-roxo bg-cartao border-2"
                    }`}
                  >
                    {momento === "passou" && <Icone nome="check" width={10} height={10} strokeWidth={3} />}
                  </span>
                </span>
                <Link
                  href={`/aulas/turmas/${turma.id}`}
                  className={`hover:bg-elevado/60 mb-1 flex items-center gap-3 rounded-2xl p-2.5 transition-colors ${
                    momento === "agora" ? "bg-ouro/8 ring-ouro/30 ring-1" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`truncate font-semibold ${momento === "passou" ? "text-suave" : ""}`}
                      >
                        {turma.nome}
                      </span>
                      {momento === "agora" && (
                        <Selo tom="ouro" pulsar>
                          Agora
                        </Selo>
                      )}
                    </span>
                    <span className="text-apagado mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Icone nome="local" width={12} height={12} />
                        {turma.local.nome}
                      </span>
                      <span>{NIVEIS[turma.nivel]}</span>
                    </span>
                  </span>
                  <Anel
                    fracao={turma.vagas > 0 ? turma.ocupadas / turma.vagas : 0}
                    tamanho={40}
                    espessura={11}
                    tom={turma.ocupadas >= turma.vagas ? "sucesso" : "roxo"}
                    rotulo={`${turma.ocupadas} de ${turma.vagas} vagas ocupadas`}
                  >
                    <span className="text-[0.62rem] font-bold tabular-nums">
                      {turma.ocupadas}/{turma.vagas}
                    </span>
                  </Anel>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Cartao>
  );
}
