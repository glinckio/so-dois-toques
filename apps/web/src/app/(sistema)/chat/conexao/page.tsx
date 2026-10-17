import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { desconectarWhatsapp } from "@/app/acoes/chat";
import { BotaoAcao } from "@/components/botao-acao";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Cartao, CabecalhoCartao } from "@/components/base/cartao";
import { Selo } from "@/components/base/selo";
import { PainelDeConexao } from "@/components/chat/painel-de-conexao";
import { AcessoNegado, Aviso, classeBotaoPerigo, classeBotaoSecundario } from "@/components/ui";
import { formatarNumero, type Conexao } from "@/lib/chat/conversa";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Conexão do WhatsApp | Só Dois Toques" };

const ESTADOS = {
  CONECTADO: { rotulo: "Conectado", tom: "sucesso" },
  CONECTANDO: { rotulo: "Conectando", tom: "ouro" },
  DESCONECTADO: { rotulo: "Desconectado", tom: "neutro" },
} as const;

/** CHAT-CA-03: estado do número, QR code e desconectar. Só o administrador. */
export default async function PaginaConexao() {
  await connection();
  const { usuario, permitido } = await exigirArea("chat");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const resposta = await chamarApi<Conexao>("/chat/conexao");

  return (
    <>
      <Cabecalho
        etiqueta="Chat"
        icone="whatsapp"
        titulo={
          <>
            Conexão do <Destaque>WhatsApp</Destaque>
          </>
        }
        descricao="O número da escola ligado ao sistema. Quem conecta é o celular da escola, lendo o QR code."
        acoes={
          <Link href="/chat" className={classeBotaoSecundario}>
            Ir para o Chat
          </Link>
        }
      />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : !resposta.dados.configurado ? (
        <Aviso tipo="info">
          WhatsApp não configurado. Preencha <code>EVOLUTION_URL</code> e{" "}
          <code>EVOLUTION_CHAVE</code> na API (veja <code>infra/evolution-api</code>).
        </Aviso>
      ) : (
        <Cartao aria-labelledby="titulo-conexao" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-conexao"
            icone="whatsapp"
            tom="roxo"
            titulo="Número da escola"
            descricao={
              resposta.dados.numero
                ? `${formatarNumero(resposta.dados.numero)}${resposta.dados.nome ? ` · ${resposta.dados.nome}` : ""}`
                : "Nenhum número conectado"
            }
            acao={
              <Selo tom={ESTADOS[resposta.dados.estado].tom}>
                {ESTADOS[resposta.dados.estado].rotulo}
              </Selo>
            }
          />
          <PainelDeConexao inicial={resposta.dados} />
          {resposta.dados.estado === "CONECTADO" && (
            <BotaoAcao
              acao={desconectarWhatsapp}
              campos={{}}
              rotulo="Desconectar o número"
              className={classeBotaoPerigo}
              confirmar="Desconectar o WhatsApp do sistema? As conversas param de chegar até conectar de novo pelo QR code."
            />
          )}
        </Cartao>
      )}
    </>
  );
}
