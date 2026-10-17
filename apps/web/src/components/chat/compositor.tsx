"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/icones";
import { classeBotaoIcone, classeCampo } from "@/components/ui";
import {
  ACEITA_NO_ANEXO,
  problemaDoArquivo,
  resumoDaMensagem,
  tamanhoLegivel,
  TEXTO_MAXIMO,
  tipoDoAnexo,
  type Mensagem,
  type TipoDeArquivo,
} from "@/lib/chat/conversa";
import { Gravador } from "./gravador";
import { SeletorDeEmojis } from "./seletor-de-emojis";

export type EnvioDeArquivo = { tipo: TipoDeArquivo; arquivo: File; legenda?: string };

/** Prévia do anexo antes de enviar: foto, nome e tamanho, com legenda (menos áudio). */
function PreviaDoAnexo({
  anexo,
  aoMudarLegenda,
  aoCancelar,
}: {
  anexo: EnvioDeArquivo;
  aoMudarLegenda: (legenda: string) => void;
  aoCancelar: () => void;
}) {
  const [url] = useState(() =>
    anexo.tipo === "imagem" ? URL.createObjectURL(anexo.arquivo) : null,
  );
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return (
    <div
      className="bg-elevado/60 flex items-start gap-3 rounded-2xl p-3"
      data-testid="previa-anexo"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Prévia" className="size-16 rounded-xl object-cover" />
      ) : (
        <span className="bg-roxo/20 text-roxo-claro grid size-16 place-items-center rounded-xl">
          <Icone nome={anexo.tipo === "audio" ? "microfone" : "documento"} width={26} height={26} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="truncate text-sm font-semibold">
          {anexo.arquivo.name} · {tamanhoLegivel(anexo.arquivo.size)}
        </p>
        {anexo.tipo !== "audio" && (
          <input
            className={`${classeCampo} !min-h-10 text-sm`}
            placeholder="Legenda (opcional)"
            aria-label="Legenda"
            maxLength={1024}
            value={anexo.legenda ?? ""}
            onChange={(e) => aoMudarLegenda(e.currentTarget.value)}
          />
        )}
      </div>
      <button
        type="button"
        className={classeBotaoIcone}
        aria-label="Tirar anexo"
        onClick={aoCancelar}
      >
        <Icone nome="fechar" width={18} height={18} />
      </button>
    </div>
  );
}

/**
 * CHAT-CA-06: escrever e enviar. Enter envia e Shift+Enter quebra a linha; anexo (foto,
 * vídeo, documento ou áudio), áudio gravado e emojis.
 */
export function Compositor({
  citada,
  aoCancelarCitacao,
  aoEnviarTexto,
  aoEnviarArquivo,
}: {
  citada: Mensagem | null;
  aoCancelarCitacao: () => void;
  aoEnviarTexto: (texto: string) => void;
  aoEnviarArquivo: (envio: EnvioDeArquivo) => void;
}) {
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<EnvioDeArquivo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const seletorAnexo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (citada) campo.current?.focus();
  }, [citada]);

  function escolher(arquivo: File | undefined) {
    setErro(null);
    if (!arquivo) return;
    const tipo = tipoDoAnexo(arquivo.type);
    if (!tipo) return setErro("Tipo de arquivo não aceito.");
    const problema = problemaDoArquivo(tipo, arquivo.type, arquivo.size);
    if (problema) return setErro(problema);
    setAnexo({ tipo, arquivo, legenda: texto.trim() || undefined });
  }

  function enviar() {
    setErro(null);
    if (anexo) {
      aoEnviarArquivo(anexo);
      setAnexo(null);
      setTexto("");
      return;
    }
    const limpo = texto.trim();
    if (!limpo) return;
    aoEnviarTexto(limpo);
    setTexto("");
  }

  function inserirEmoji(emoji: string) {
    const el = campo.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, inicio) + emoji + texto.slice(fim));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(inicio + emoji.length, inicio + emoji.length);
    });
  }

  return (
    <div className="border-borda/70 flex flex-col gap-2 border-t p-3">
      {erro && (
        <p role="alert" className="text-perigo px-1 text-sm">
          {erro}
        </p>
      )}
      {citada && (
        <div className="bg-elevado/60 border-ouro flex items-center gap-2 rounded-xl border-l-4 px-3 py-2 text-sm">
          <Icone nome="responder" width={16} height={16} className="text-ouro shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Respondendo: {resumoDaMensagem(citada) || "mensagem"}
          </span>
          <button type="button" aria-label="Cancelar resposta" onClick={aoCancelarCitacao}>
            <Icone nome="fechar" width={16} height={16} />
          </button>
        </div>
      )}
      {anexo && (
        <PreviaDoAnexo
          anexo={anexo}
          aoMudarLegenda={(legenda) => setAnexo({ ...anexo, legenda })}
          aoCancelar={() => setAnexo(null)}
        />
      )}
      <div className="flex items-end gap-1.5">
        <SeletorDeEmojis aoEscolher={inserirEmoji} />
        <button
          type="button"
          className={classeBotaoIcone}
          aria-label="Anexar foto, vídeo, documento ou áudio"
          title="Anexar: foto, vídeo, documento ou áudio (até 10 MB)"
          onClick={() => seletorAnexo.current?.click()}
        >
          <Icone nome="clipe" width={20} height={20} />
        </button>
        <input
          ref={seletorAnexo}
          type="file"
          accept={ACEITA_NO_ANEXO}
          className="hidden"
          data-testid="arquivo-anexo"
          onChange={(e) => {
            escolher(e.currentTarget.files?.[0]);
            e.currentTarget.value = "";
          }}
        />
        <label htmlFor="mensagem" className="sr-only">
          Mensagem
        </label>
        <textarea
          ref={campo}
          id="mensagem"
          rows={1}
          maxLength={TEXTO_MAXIMO}
          value={anexo ? (anexo.legenda ?? "") : texto}
          disabled={Boolean(anexo)}
          placeholder={anexo ? "Use a legenda acima" : "Escreva uma mensagem"}
          onChange={(e) => setTexto(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              enviar();
            }
          }}
          className={`${classeCampo} [field-sizing:content] max-h-40 min-h-11 flex-1 resize-none py-2.5`}
        />
        {texto.trim() || anexo ? (
          <button
            type="button"
            onClick={enviar}
            aria-label="Enviar"
            className={`${classeBotaoIcone} from-roxo bg-linear-to-b to-[#6d28d9] text-white`}
          >
            <Icone nome="enviar" width={19} height={19} />
          </button>
        ) : (
          <Gravador aoGravar={(arquivo) => aoEnviarArquivo({ tipo: "audio", arquivo })} />
        )}
      </div>
    </div>
  );
}
