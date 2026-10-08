import Link from "next/link";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { Selo } from "@/components/base/selo";
import { Icone, type NomeIcone } from "@/components/icones";
import { Aviso } from "@/components/ui";
import { horaEmSaoPaulo } from "@/lib/aulas/formatacao";
import { tempoDecorrido } from "@/lib/base/tempo";
import type { Turno } from "@/lib/caixa/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import type { CaixaDoDia, Inadimplentes } from "@/lib/mensalidades/tipos";
import type { RespostaApi } from "@/lib/servidor/api";

const FORMAS_DO_CARTAO: {
  rotulo: string;
  icone: NomeIcone;
  chaves: (keyof CaixaDoDia["resumo"]["porForma"])[];
}[] = [
  { rotulo: "Pix", icone: "pix", chaves: ["PIX"] },
  { rotulo: "Dinheiro", icone: "dinheiro", chaves: ["DINHEIRO"] },
  { rotulo: "Cartão", icone: "cartao", chaves: ["CARTAO_DEBITO", "CARTAO_CREDITO"] },
];

/**
 * Caixa de hoje: se o caixa está aberto (e há quanto tempo), o saldo do dia que
 * sobe ao abrir, entradas contra saídas numa barra só e o saldo por forma.
 */
export function CaixaDeHoje({
  caixa,
  turno,
  inadimplentes,
  agora,
}: {
  caixa: RespostaApi<CaixaDoDia>;
  turno: Turno | null;
  inadimplentes: RespostaApi<Inadimplentes>;
  agora: Date;
}) {
  const resumo = caixa.ok ? caixa.dados.resumo : null;
  const movimento = resumo ? resumo.entradas + resumo.saidas : 0;
  const parteEntradas =
    movimento > 0 && resumo ? Math.round((resumo.entradas / movimento) * 100) : 0;
  return (
    <Cartao aria-labelledby="titulo-caixa-hoje" className="flex flex-col gap-5">
      <CabecalhoCartao
        id="titulo-caixa-hoje"
        icone="caixa"
        tom="ouro"
        titulo="Caixa de hoje"
        acao={<LinkDoCartao href="/caixa">Abrir</LinkDoCartao>}
      />
      <div
        className="border-borda bg-elevado/35 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-3.5 py-2.5 text-sm"
        data-testid="situacao-caixa"
      >
        {turno ? (
          <>
            <Selo tom="sucesso" pulsar>
              Aberto
            </Selo>
            <span className="text-suave">
              há <strong className="text-texto">{tempoDecorrido(turno.abertaEm, agora)}</strong>,
              desde {horaEmSaoPaulo(turno.abertaEm)} por {turno.abertaPor}
            </span>
          </>
        ) : (
          <>
            <Selo tom="neutro">Fechado</Selo>
            <span className="text-suave">Abra o caixa para começar o turno.</span>
          </>
        )}
      </div>
      {resumo ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-apagado text-sm">Saldo do dia</span>
            <NumeroAnimado
              valor={resumo.saldo}
              centavosMenores
              testId="saldo-do-dia"
              className={`text-4xl leading-none font-extrabold tracking-tight ${resumo.saldo < 0 ? "text-perigo" : ""}`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <svg
              role="img"
              aria-label={
                movimento > 0
                  ? `Entradas ${parteEntradas}% e saídas ${100 - parteEntradas}% do movimento do dia`
                  : "Sem movimento no dia"
              }
              className="h-2.5 w-full"
              preserveAspectRatio="none"
            >
              <rect width="100%" height="100%" rx="5" className="fill-elevado" />
              {movimento > 0 && (
                <>
                  <rect
                    width={`${parteEntradas}%`}
                    height="100%"
                    rx="5"
                    className="fill-sucesso animate-crescer-x origem-esquerda"
                  />
                  {parteEntradas < 100 && (
                    <rect
                      x={`${parteEntradas}%`}
                      width={`${100 - parteEntradas}%`}
                      height="100%"
                      rx="5"
                      className="fill-perigo/80 animate-entrar [animation-delay:500ms]"
                    />
                  )}
                </>
              )}
            </svg>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-sucesso/15 text-sucesso grid size-7 place-items-center rounded-lg">
                  <Icone nome="entrada" width={15} height={15} />
                </span>
                <div>
                  <dt className="text-apagado text-xs">Entradas</dt>
                  <dd className="font-semibold tabular-nums">{formatarReais(resumo.entradas)}</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-perigo/15 text-perigo grid size-7 place-items-center rounded-lg">
                  <Icone nome="saida" width={15} height={15} />
                </span>
                <div>
                  <dt className="text-apagado text-xs">Saídas</dt>
                  <dd className="font-semibold tabular-nums">{formatarReais(resumo.saidas)}</dd>
                </div>
              </div>
            </dl>
          </div>
          <ul className="grid grid-cols-3 gap-2" aria-label="Saldo por forma de pagamento">
            {FORMAS_DO_CARTAO.map((f) => {
              const saldo = f.chaves.reduce((t, c) => t + (resumo.porForma[c]?.saldo ?? 0), 0);
              return (
                <li key={f.rotulo} className="bg-elevado/45 flex flex-col gap-1 rounded-2xl p-3">
                  <span className="text-apagado flex items-center gap-1.5 text-xs font-semibold">
                    <Icone nome={f.icone} width={14} height={14} />
                    {f.rotulo}
                  </span>
                  <span className="text-sm font-bold tabular-nums">{formatarReais(saldo)}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        !caixa.ok && <Aviso tipo="erro">{caixa.mensagem}</Aviso>
      )}
      {inadimplentes.ok && inadimplentes.dados.itens.length > 0 && (
        <Link
          href="/caixa/inadimplentes"
          className="border-ouro/35 bg-ouro/10 hover:bg-ouro/15 group mt-auto flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm transition-colors"
        >
          <span className="bg-ouro/20 text-ouro grid size-8 shrink-0 place-items-center rounded-xl">
            <Icone nome="alerta" width={16} height={16} />
          </span>
          <span className="flex-1">
            <strong>
              {inadimplentes.dados.itens.length}{" "}
              {inadimplentes.dados.itens.length === 1 ? "aluno em atraso" : "alunos em atraso"}
            </strong>
            <span className="text-suave block text-xs">
              {formatarReais(inadimplentes.dados.totalCentavos)} a receber
            </span>
          </span>
          <Icone
            nome="seta"
            width={16}
            height={16}
            className="text-ouro transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </Cartao>
  );
}
