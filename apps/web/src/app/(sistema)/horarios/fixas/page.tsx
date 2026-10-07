import type { Metadata } from "next";
import { connection } from "next/server";
import { encerrarSerie } from "@/app/acoes/horarios";
import { BotaoAcao } from "@/components/botao-acao";
import { Aviso } from "@/components/ui";
import { DIAS_SEMANA, formatarData } from "@/lib/aulas/formatacao";
import { faixaDeHoras } from "@/lib/horarios/formatacao";
import type { Serie } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Reservas fixas | Só Dois Toques" };

/** HOR-CA-05 e 06: mensalistas e bloqueios semanais em vigor. */
export default async function PaginaFixas() {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const resposta = await chamarApi<Serie[]>("/horarios/series");
  return (
    <>
      <h1 className="text-2xl font-semibold">Reservas fixas e bloqueios semanais</h1>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.length === 0 ? (
        <p className="opacity-80">Nenhuma reserva fixa em vigor.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Reservas fixas">
          {resposta.dados.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-lg border border-current/15 p-3">
              <p className="font-medium">
                {s.tipo === "BLOQUEIO" ? `Bloqueio: ${s.motivo}` : s.clienteNome}
              </p>
              <p className="text-sm opacity-80">
                {s.quadra} · {DIAS_SEMANA[s.diaSemana]}s · {faixaDeHoras(s.horaInicio, s.horaFim)} ·
                de {formatarData(s.dataInicio)} a {formatarData(s.dataFim)}
              </p>
              <p className="text-sm">
                {s.proximas} {s.proximas === 1 ? "data à frente" : "datas à frente"}
                {s.tipo === "RESERVA" &&
                  `, ${s.proximasPagas} paga${s.proximasPagas === 1 ? "" : "s"}`}
              </p>
              {(admin || s.tipo === "RESERVA") && (
                <div className="self-start">
                  <BotaoAcao
                    acao={encerrarSerie}
                    campos={{ serieId: s.id }}
                    rotulo="Encerrar"
                    confirmar="Encerrar esta reserva fixa? As datas futuras não pagas serão canceladas."
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
