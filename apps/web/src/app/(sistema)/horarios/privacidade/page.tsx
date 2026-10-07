import type { Metadata } from "next";
import { connection } from "next/server";
import { anonimizarClientes } from "@/app/acoes/horarios";
import { BotaoAcao } from "@/components/botao-acao";
import { AcessoNegado, Aviso } from "@/components/ui";
import { formatarData } from "@/lib/aulas/formatacao";
import type { ClientesAnonimizaveis } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Privacidade dos clientes | Só Dois Toques" };

/** LANC-CA-07 e 08: prazo de guarda do nome e telefone de quem aluga quadra. */
export default async function PaginaPrivacidade() {
  await connection();
  const { usuario } = await exigirArea("horarios");
  if (usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const previa = await chamarApi<ClientesAnonimizaveis>("/horarios/clientes/anonimizaveis");
  return (
    <>
      <h1 className="text-2xl font-semibold">Privacidade dos clientes</h1>
      <p className="text-suave">
        Nome e telefone de quem aluga quadra servem para o atendimento. Depois de 12 meses, eles
        podem ser apagados: a reserva continua com valor, horário e pagamento, mas o cliente vira
        &quot;Cliente anonimizado&quot;. Isso não pode ser desfeito.
      </p>
      {!previa.ok ? (
        <Aviso tipo="erro">{previa.mensagem}</Aviso>
      ) : (
        <section aria-label="Reservas além do prazo" className="flex flex-col gap-3">
          <p>
            Reservas antes de {formatarData(previa.dados.antesDe)}: {previa.dados.reservas}{" "}
            {previa.dados.reservas === 1 ? "reserva avulsa" : "reservas avulsas"} e{" "}
            {previa.dados.series} {previa.dados.series === 1 ? "reserva fixa" : "reservas fixas"}{" "}
            com dados de cliente.
          </p>
          {previa.dados.reservas + previa.dados.series > 0 ? (
            <BotaoAcao
              acao={anonimizarClientes}
              campos={{}}
              rotulo="Anonimizar clientes"
              confirmar="Apagar nome e telefone desses clientes? Isso não pode ser desfeito."
            />
          ) : (
            <p className="text-suave text-sm">Nada para anonimizar agora.</p>
          )}
        </section>
      )}
    </>
  );
}
