import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { encerrarSerie } from "@/app/acoes/horarios";
import { BarraNivel } from "@/components/base/barra";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Selo } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { BotaoAcao } from "@/components/botao-acao";
import { FUNDO_DA_SITUACAO } from "@/components/horarios/estilos";
import { Icone } from "@/components/icones";
import { Aviso, classeBotao, classeBotaoPerigo } from "@/components/ui";
import { DIAS_CURTOS, DIAS_SEMANA, formatarData } from "@/lib/aulas/formatacao";
import { faixaDeHoras, rotuloHora } from "@/lib/horarios/formatacao";
import type { Serie } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Reservas fixas | Só Dois Toques" };

/**
 * HOR-CA-05 e 06: mensalistas e bloqueios semanais em vigor, pela ordem da semana.
 * Cada fixa tem a folhinha do dia na cor da grade (roxo para reserva, listrado para
 * bloqueio) e a barra das datas à frente já pagas.
 */
export default async function PaginaFixas() {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const resposta = await chamarApi<Serie[]>("/horarios/series");
  const series = resposta.ok
    ? [...resposta.dados].sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio - b.horaInicio)
    : [];
  return (
    <>
      <Cabecalho
        etiqueta="Quadras de areia"
        icone="repetir"
        titulo={
          <>
            Reservas <Destaque>fixas</Destaque> e bloqueios semanais
          </>
        }
        descricao="O que se repete toda semana, na ordem da semana. Encerrar cancela as datas futuras que não foram pagas."
      />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : series.length === 0 ? (
        <Vazio
          titulo="Nenhuma reserva fixa em vigor."
          acao={
            <Link href="/horarios/nova" className={classeBotao}>
              <Icone nome="repetir" width={18} height={18} />
              Criar uma reserva fixa
            </Link>
          }
        >
          Na nova reserva, escolha &quot;Toda semana (fixa)&quot; para o mensalista.
        </Vazio>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2" aria-label="Reservas fixas">
          {series.map((s, i) => {
            const bloqueio = s.tipo === "BLOQUEIO";
            const fracao = s.proximas > 0 ? s.proximasPagas / s.proximas : 0;
            return (
              <li
                key={s.id}
                className={`superficie animate-entrar flex flex-col gap-4 rounded-[1.5rem] p-4 sm:flex-row sm:items-center atraso-${Math.min(24, i + 2)}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span
                    aria-hidden="true"
                    className={`flex w-[4.25rem] shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-2.5 ${FUNDO_DA_SITUACAO[bloqueio ? "bloqueio" : "fixa"]}`}
                  >
                    <span className="text-[0.65rem] font-bold tracking-[0.14em] uppercase">
                      {DIAS_CURTOS[s.diaSemana]}
                    </span>
                    <span className="text-lg leading-none font-extrabold tabular-nums">
                      {rotuloHora(s.horaInicio).slice(0, 2)}h
                    </span>
                    <span className="text-suave text-[0.65rem] font-semibold tabular-nums">
                      até {rotuloHora(s.horaFim).slice(0, 2)}h
                    </span>
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-bold">
                        {bloqueio ? `Bloqueio: ${s.motivo}` : s.clienteNome}
                      </span>
                      <Selo tom={bloqueio ? "neutro" : "roxo"}>
                        {bloqueio ? "Bloqueio" : "Fixa"}
                      </Selo>
                    </p>
                    <p className="text-apagado text-sm">
                      {s.quadra} · {DIAS_SEMANA[s.diaSemana]}s ·{" "}
                      {faixaDeHoras(s.horaInicio, s.horaFim)} · de {formatarData(s.dataInicio)} a{" "}
                      {formatarData(s.dataFim)}
                    </p>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <p className="text-suave text-xs font-semibold">
                        {s.proximas} {s.proximas === 1 ? "data à frente" : "datas à frente"}
                        {!bloqueio &&
                          `, ${s.proximasPagas} paga${s.proximasPagas === 1 ? "" : "s"}`}
                      </p>
                      {!bloqueio && s.proximas > 0 && (
                        <BarraNivel
                          fracao={fracao}
                          tom="sucesso"
                          altura="h-1.5"
                          rotulo={`${s.proximasPagas} de ${s.proximas} datas à frente pagas`}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {(admin || !bloqueio) && (
                  <div className="shrink-0 sm:self-center">
                    <BotaoAcao
                      acao={encerrarSerie}
                      campos={{ serieId: s.id }}
                      rotulo="Encerrar"
                      className={classeBotaoPerigo}
                      confirmar="Encerrar esta reserva fixa? As datas futuras não pagas serão canceladas."
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
