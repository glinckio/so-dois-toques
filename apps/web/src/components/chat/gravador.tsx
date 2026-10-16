"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/icones";
import { classeBotaoIcone } from "@/components/ui";
import { duracao } from "@/lib/chat/conversa";

/** Formatos de gravação em ordem de preferência (Chrome e Firefox gravam webm; Safari, mp4). */
const FORMATOS = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"];

/** Duração máxima de um áudio gravado no navegador. */
const MAXIMO_SEGUNDOS = 5 * 60;

/**
 * CHAT-CA-06: grava áudio no navegador e entrega o arquivo, que chega como mensagem de
 * voz. Durante a gravação: tempo, cancelar e enviar.
 */
export function Gravador({
  aoGravar,
  desabilitado,
}: {
  aoGravar: (arquivo: File) => void;
  desabilitado?: boolean;
}) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const cancelado = useRef(false);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);

  const parar = (cancelar: boolean) => {
    cancelado.current = cancelar;
    if (relogio.current) clearInterval(relogio.current);
    gravador.current?.stop();
  };

  useEffect(() => {
    if (segundos >= MAXIMO_SEGUNDOS) parar(false);
  }, [segundos]);

  useEffect(
    () => () => {
      if (relogio.current) clearInterval(relogio.current);
      gravador.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function comecar() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const formato = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
      const r = new MediaRecorder(stream, formato ? { mimeType: formato } : undefined);
      pedacos.current = [];
      cancelado.current = false;
      r.ondataavailable = (e) => {
        if (e.data.size > 0) pedacos.current.push(e.data);
      };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        if (cancelado.current || pedacos.current.length === 0) return;
        const tipo = (r.mimeType || formato || "audio/webm").split(";")[0]!;
        const extensao = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
        aoGravar(new File(pedacos.current, `audio.${extensao}`, { type: tipo }));
      };
      gravador.current = r;
      r.start();
      setSegundos(0);
      setGravando(true);
      relogio.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    } catch {
      setErro("Não foi possível usar o microfone. Libere o acesso no navegador.");
    }
  }

  if (!gravando) {
    return (
      <div className="relative">
        <button
          type="button"
          className={classeBotaoIcone}
          aria-label="Gravar áudio"
          title="Gravar áudio de voz"
          onClick={comecar}
          disabled={desabilitado}
        >
          <Icone nome="microfone" width={20} height={20} />
        </button>
        {erro && (
          <p role="alert" className="text-perigo absolute right-0 bottom-14 w-60 text-xs">
            {erro}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-perigo/10 border-perigo/30 flex items-center gap-2 rounded-full border px-2 py-1">
      <span className="bg-perigo size-2.5 animate-pulse rounded-full" aria-hidden="true" />
      <span className="text-sm font-semibold tabular-nums" aria-live="polite">
        Gravando {duracao(segundos)}
      </span>
      <button
        type="button"
        className={`${classeBotaoIcone} !size-9`}
        aria-label="Cancelar gravação"
        onClick={() => parar(true)}
      >
        <Icone nome="lixeira" width={17} height={17} />
      </button>
      <button
        type="button"
        className={`${classeBotaoIcone} bg-sucesso/20 text-sucesso !size-9`}
        aria-label="Enviar áudio"
        onClick={() => parar(false)}
      >
        <Icone nome="enviar" width={17} height={17} />
      </button>
    </div>
  );
}
