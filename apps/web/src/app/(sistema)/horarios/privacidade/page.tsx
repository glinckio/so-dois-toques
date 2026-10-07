import type { Metadata } from "next";
import { connection } from "next/server";
import { anonimizarClientes } from "@/app/acoes/horarios";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { SeloIcone } from "@/components/base/selo";
import { BotaoAcao } from "@/components/botao-acao";
import { Icone } from "@/components/icones";
import { AcessoNegado, Aviso, classeBotaoPerigo, classeCartao } from "@/components/ui";
import { formatarData } from "@/lib/aulas/formatacao";
import type { ClientesAnonimizaveis } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Privacidade dos clientes | Só Dois Toques" };

/**
 * LANC-CA-07 e 08: prazo de guarda do nome e telefone de quem aluga quadra. A linha do
 * prazo separa o que ainda fica guardado do que já pode ser apagado.
 */
export default async function PaginaPrivacidade() {
  await connection();
  const { usuario } = await exigirArea("horarios");
  if (usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const previa = await chamarApi<ClientesAnonimizaveis>("/horarios/clientes/anonimizaveis");
  return (
    <>
      <Cabecalho
        etiqueta="Quadras de areia"
        icone="escudo"
        titulo={
          <>
            Privacidade dos <Destaque>clientes</Destaque>
          </>
        }
        descricao={
          <>
            Nome e telefone de quem aluga quadra servem para o atendimento. Depois de 12 meses, eles
            podem ser apagados: a reserva continua com valor, horário e pagamento, mas o cliente
            vira &quot;Cliente anonimizado&quot;. Isso não pode ser desfeito.
          </>
        }
      />
      {!previa.ok ? (
        <Aviso tipo="erro">{previa.mensagem}</Aviso>
      ) : (
        <section
          aria-label="Reservas além do prazo"
          className={`${classeCartao} flex flex-col gap-5`}
        >
          <div className="flex items-center gap-4">
            <SeloIcone nome="escudo" tom="roxo" tamanho="g" />
            <div className="flex min-w-0 flex-col">
              <span className="text-apagado text-[0.7rem] font-bold tracking-[0.16em] uppercase">
                Prazo de guarda
              </span>
              <span className="text-2xl font-extrabold">{previa.dados.meses} meses</span>
            </div>
          </div>
          <div aria-hidden="true" className="flex flex-col gap-1.5">
            <div className="flex h-11 overflow-hidden rounded-2xl text-xs font-semibold">
              <span className="bg-perigo/12 text-perigo flex flex-1 items-center gap-2 px-3">
                <Icone nome="lixeira" width={15} height={15} className="shrink-0" />
                Pode apagar
              </span>
              <span className="bg-ouro w-1 shrink-0" />
              <span className="bg-sucesso/12 text-sucesso flex flex-[2] items-center justify-end gap-2 px-3">
                Guardado
                <Icone nome="cadeado" width={15} height={15} className="shrink-0" />
              </span>
            </div>
            <div className="text-apagado flex text-[0.7rem] font-semibold tabular-nums">
              <span className="flex-1">reservas antigas</span>
              <span className="text-ouro -translate-x-1/2">
                {formatarData(previa.dados.antesDe)}
              </span>
              <span className="flex-[2] text-right">hoje</span>
            </div>
          </div>
          <p className="text-suave">
            Reservas antes de {formatarData(previa.dados.antesDe)}:{" "}
            <strong className="text-texto">{previa.dados.reservas}</strong>{" "}
            {previa.dados.reservas === 1 ? "reserva avulsa" : "reservas avulsas"} e{" "}
            <strong className="text-texto">{previa.dados.series}</strong>{" "}
            {previa.dados.series === 1 ? "reserva fixa" : "reservas fixas"} com dados de cliente.
          </p>
          {previa.dados.reservas + previa.dados.series > 0 ? (
            <div className="self-start">
              <BotaoAcao
                acao={anonimizarClientes}
                campos={{}}
                rotulo="Anonimizar clientes"
                className={classeBotaoPerigo}
                confirmar="Apagar nome e telefone desses clientes? Isso não pode ser desfeito."
              />
            </div>
          ) : (
            <p className="bg-sucesso/10 text-sucesso flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold">
              <Icone nome="check" width={16} height={16} strokeWidth={2.6} />
              Nada para anonimizar agora.
            </p>
          )}
        </section>
      )}
    </>
  );
}
