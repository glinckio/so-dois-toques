import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Chat } from "@/components/chat/chat";
import { AcessoNegado, Aviso, classeBotao } from "@/components/ui";
import type { Conexao, Conversa, PaginaDeMensagens } from "@/lib/chat/conversa";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Chat | Só Dois Toques" };

const NUMERO = /^\d{10,15}$/;

/**
 * CHAT-CA-04 a 12: o WhatsApp da escola dentro do sistema. Sem configuração, avisa; sem o
 * número conectado, leva o administrador à conexão.
 */
export default async function PaginaChat({ searchParams }: PageProps<"/chat">) {
  await connection();
  const { usuario, permitido } = await exigirArea("chat");
  if (!permitido) return <AcessoNegado />;
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { numero } = await searchParams;
  const numeroInicial = typeof numero === "string" && NUMERO.test(numero) ? numero : null;

  const conexao = await chamarApi<Conexao>("/chat/conexao");
  const cabecalho = (
    <Cabecalho
      etiqueta="Operação"
      icone="chat"
      titulo={
        <>
          Chat do <Destaque>WhatsApp</Destaque>
        </>
      }
      descricao="Converse com alunos e interessados pelo número da escola."
      acoes={
        admin && (
          <Link href="/chat/conexao" className={classeBotao}>
            Conexão do número
          </Link>
        )
      }
    />
  );

  if (!conexao.ok) {
    return (
      <>
        {cabecalho}
        <Aviso tipo="erro">{conexao.mensagem}</Aviso>
      </>
    );
  }
  if (!conexao.dados.configurado) {
    return (
      <>
        {cabecalho}
        <Aviso tipo="info">
          WhatsApp não configurado. Veja em <code>infra/evolution-api</code> como ligar o servidor
          do WhatsApp ao sistema.
        </Aviso>
      </>
    );
  }
  if (conexao.dados.estado !== "CONECTADO") {
    return (
      <>
        {cabecalho}
        <Aviso tipo="info">
          {admin ? (
            <>
              O número da escola não está conectado.{" "}
              <Link href="/chat/conexao" className="font-semibold underline">
                Conectar pelo QR code
              </Link>
              .
            </>
          ) : (
            "O número da escola não está conectado. Peça ao administrador para conectar."
          )}
        </Aviso>
      </>
    );
  }

  const [conversas, inicial] = await Promise.all([
    chamarApi<Conversa[]>("/chat/conversas"),
    numeroInicial
      ? chamarApi<PaginaDeMensagens>(`/chat/conversas/${numeroInicial}/mensagens`)
      : null,
  ]);
  return (
    <>
      {cabecalho}
      {conversas.ok ? (
        <Chat
          key={numeroInicial ?? ""}
          conversasIniciais={conversas.dados}
          inicial={inicial?.ok ? inicial.dados : null}
        />
      ) : (
        <Aviso tipo="erro">{conversas.mensagem}</Aviso>
      )}
    </>
  );
}
