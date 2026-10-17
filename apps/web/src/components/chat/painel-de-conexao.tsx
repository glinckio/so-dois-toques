"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { conectarWhatsapp } from "@/app/acoes/chat";
import { Carregando } from "@/components/base/bola";
import { Aviso, classeBotao } from "@/components/ui";
import type { Conexao, EventoChat } from "@/lib/chat/conversa";

/**
 * CHAT-CA-03: gerar o QR code e acompanhar até o celular conectar. O QR code novo e a
 * mudança de estado chegam pelos eventos ao vivo (só o administrador recebe o QR code).
 */
export function PainelDeConexao({ inicial }: { inicial: Conexao }) {
  const router = useRouter();
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conectouAgora, setConectado] = useState(false);
  const conectado = conectouAgora || inicial.estado === "CONECTADO";

  useEffect(() => {
    if (!qrcode) return;
    const fonte = new EventSource("/chat/eventos");
    fonte.onmessage = (e) => {
      try {
        const evento = JSON.parse(e.data) as EventoChat;
        if (evento.tipo === "qrcode") setQrcode(evento.base64);
        if (evento.tipo === "conexao" && evento.estado === "CONECTADO") {
          setConectado(true);
          setQrcode(null);
          router.refresh();
        }
      } catch {
        // evento que a tela não entende
      }
    };
    // Sem eventos ao vivo, confere o estado de tempos em tempos.
    const relogio = setInterval(() => router.refresh(), 5_000);
    return () => {
      fonte.close();
      clearInterval(relogio);
    };
  }, [qrcode, router]);

  if (conectado) {
    return <Aviso tipo="sucesso">WhatsApp conectado. As conversas já aparecem no Chat.</Aviso>;
  }

  return (
    <div className="flex flex-col items-start gap-4">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {qrcode ? (
        <div className="flex flex-col items-center gap-3 self-center">
          <div className="rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrcode}
              alt="QR code para conectar o WhatsApp"
              className="size-64"
              data-testid="qrcode"
            />
          </div>
          <p className="text-suave max-w-sm text-center text-sm">
            No celular da escola, abra o WhatsApp → <strong>Aparelhos conectados</strong> →{" "}
            <strong>Conectar um aparelho</strong> e leia o código. Ele se renova sozinho.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className={classeBotao}
          disabled={gerando}
          onClick={async () => {
            setErro(null);
            setGerando(true);
            const r = await conectarWhatsapp();
            setGerando(false);
            if (!r.ok) return setErro(r.mensagem);
            if (r.dados.estado === "CONECTADO") return setConectado(true);
            if (!r.dados.qrcode) return setErro("O WhatsApp não mandou o QR code. Tente de novo.");
            setQrcode(r.dados.qrcode);
          }}
        >
          {gerando && <Carregando />}
          Conectar pelo QR code
        </button>
      )}
    </div>
  );
}
