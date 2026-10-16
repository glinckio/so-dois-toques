import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { encerrarSerie } from "@/app/acoes/horarios";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Vazio } from "@/components/base/vazio";
import { BotaoAcao } from "@/components/botao-acao";
import { FUNDO_DA_SITUACAO } from "@/components/horarios/estilos";
import { Icone } from "@/components/icones";
import { Aviso, classeBotao, classeBotaoPerigo } from "@/components/ui";
import { DIAS_CURTOS, DIAS_SEMANA, formatarData } from "@/lib/aulas/formatacao";
import { faixaDeHoras, rotuloHora } from "@/lib/horarios/formatacao";
import type { SerieBloqueio } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Bloqueios semanais | Só Dois Toques" };

/**
 * FOCO-CA-06 e 07: bloqueios que se repetem toda semana, na ordem da semana. Encerrar
 * libera as datas que ainda não começaram (só o administrador).
 */
export default async function PaginaSemanais() {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const resposta = await chamarApi<SerieBloqueio[]>("/horarios/series");
  const series = resposta.ok
    ? [...resposta.dados].sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio - b.horaInicio)
    : [];
  return (
    <>
      <Cabecalho
        etiqueta="Quadra"
        icone="repetir"
        titulo={
          <>
            Bloqueios <Destaque>semanais</Destaque>
          </>
        }
        descricao="O que fecha a quadra toda semana, na ordem da semana. As aulas das turmas não entram aqui: elas vêm das próprias turmas."
      />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : series.length === 0 ? (
        <Vazio
          titulo="Nenhum bloqueio semanal em vigor."
          acao={
            admin && (
              <Link href="/horarios/bloquear" className={classeBotao}>
                <Icone nome="repetir" width={18} height={18} />
                Criar um bloqueio semanal
              </Link>
            )
          }
        >
          {admin
            ? 'Em "Bloquear horário", escolha "Toda semana".'
            : "Quando o administrador bloquear a quadra toda semana, aparece aqui."}
        </Vazio>
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2" aria-label="Bloqueios semanais">
          {series.map((s, i) => (
            <li
              key={s.id}
              className={`superficie animate-entrar flex flex-col gap-4 rounded-[1.5rem] p-4 sm:flex-row sm:items-center atraso-${Math.min(24, i + 2)}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span
                  aria-hidden="true"
                  className={`flex w-[4.25rem] shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-2.5 ${FUNDO_DA_SITUACAO.bloqueio}`}
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
                  <p className="truncate font-bold">{s.motivo}</p>
                  <p className="text-suave text-xs font-semibold">{s.quadra.nome}</p>
                  <p className="text-apagado text-sm">
                    {DIAS_SEMANA[s.diaSemana]}s · {faixaDeHoras(s.horaInicio, s.horaFim)} · de{" "}
                    {formatarData(s.dataInicio)} a {formatarData(s.dataFim)}
                  </p>
                  <p className="text-suave text-xs font-semibold">
                    {s.proximos} {s.proximos === 1 ? "data à frente" : "datas à frente"}
                  </p>
                </div>
              </div>
              {admin && (
                <div className="shrink-0 sm:self-center">
                  <BotaoAcao
                    acao={encerrarSerie}
                    campos={{ serieId: s.id }}
                    rotulo="Encerrar"
                    className={classeBotaoPerigo}
                    confirmar="Encerrar este bloqueio semanal? As datas que ainda não começaram ficam livres."
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
