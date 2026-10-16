"use client";

import { useState, type ReactNode } from "react";
import { Icone } from "@/components/icones";
import { duracao, horaDaMensagem, type Mensagem } from "@/lib/chat/conversa";
import { REACOES_RAPIDAS } from "./seletor-de-emojis";

const LINK = /(https?:\/\/[^\s<>"]+)/g;

/** Texto com os links clicáveis (abrem em outra aba). */
function TextoComLinks({ texto }: { texto: string }) {
  const partes = texto.split(LINK);
  return (
    <p className="break-words whitespace-pre-wrap">
      {partes.map((parte, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={parte}
            target="_blank"
            rel="noopener noreferrer"
            className="text-roxo-claro underline underline-offset-2"
          >
            {parte}
          </a>
        ) : (
          parte
        ),
      )}
    </p>
  );
}

function Situacao({ situacao }: { situacao: Mensagem["situacao"] }) {
  if (!situacao || situacao === "PENDENTE") {
    return <Icone nome="relogio" width={13} height={13} aria-label="Enviando" />;
  }
  if (situacao === "ERRO") return <span className="text-perigo">Erro</span>;
  const duas = situacao === "ENTREGUE" || situacao === "LIDA";
  const rotulo = { ENVIADA: "Enviada", ENTREGUE: "Entregue", LIDA: "Lida" }[situacao];
  return (
    <span
      className={`inline-flex ${situacao === "LIDA" ? "text-sky-400" : ""}`}
      role="img"
      aria-label={rotulo}
      title={rotulo}
    >
      <Icone nome="check" width={14} height={14} strokeWidth={2.4} />
      {duas && <Icone nome="check" width={14} height={14} strokeWidth={2.4} className="-ml-2.5" />}
    </span>
  );
}

function Conteudo({ m, src }: { m: Mensagem; src: string }) {
  switch (m.tipo) {
    case "texto":
      return <TextoComLinks texto={m.texto ?? ""} />;
    case "imagem":
      return (
        <>
          <a href={src} target="_blank" rel="noopener" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={m.texto ? `Foto: ${m.texto}` : "Foto recebida"}
              loading="lazy"
              className="bg-elevado max-h-80 w-full max-w-72 rounded-xl object-cover"
            />
          </a>
          {m.texto && <TextoComLinks texto={m.texto} />}
        </>
      );
    case "video":
      return (
        <>
          <video controls preload="none" src={src} className="max-h-80 w-full max-w-72 rounded-xl">
            <track kind="captions" />
          </video>
          {m.texto && <TextoComLinks texto={m.texto} />}
        </>
      );
    case "audio":
      return (
        <div className="flex flex-col gap-1">
          <audio controls preload="none" src={src} className="h-10 w-64 max-w-full" />
          {m.midia?.segundos ? (
            <span className="text-apagado text-xs">{duracao(m.midia.segundos)}</span>
          ) : null}
        </div>
      );
    case "documento":
      return (
        <a
          href={`${src}&baixar=1`}
          className="bg-elevado/70 hover:bg-elevado flex items-center gap-3 rounded-xl px-3 py-2"
        >
          <Icone nome="documento" width={26} height={26} className="text-roxo-claro shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {m.midia?.nomeArquivo ?? "Documento"}
            </span>
            <span className="text-apagado text-xs">Baixar</span>
          </span>
          {m.texto && <span className="sr-only">{m.texto}</span>}
        </a>
      );
    case "figurinha":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Figurinha" loading="lazy" className="size-32 object-contain" />
      );
    case "localizacao":
      return <p>📍 {m.texto ?? "Localização"}</p>;
    case "contato":
      return <p>👤 {m.texto ?? "Contato"}</p>;
    default:
      return <p className="text-apagado italic">Mensagem não suportada: abra no celular.</p>;
  }
}

function Acao({
  rotulo,
  aoClicar,
  children,
}: {
  rotulo: string;
  aoClicar: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      title={rotulo}
      className="text-suave hover:text-texto hover:bg-elevado grid size-8 place-items-center rounded-full text-base"
    >
      {children}
    </button>
  );
}

/**
 * CHAT-CA-07 e 09: uma mensagem da conversa. Recebidas à esquerda, enviadas à direita
 * com a situação (enviada, entregue, lida) e quem da equipe enviou.
 */
export function Bolha({
  m,
  reacoes,
  aoResponder,
  aoReagir,
  aoReenviarFigurinha,
}: {
  m: Mensagem;
  reacoes: readonly string[];
  aoResponder: (m: Mensagem) => void;
  aoReagir: (m: Mensagem, emoji: string) => void;
  aoReenviarFigurinha: (m: Mensagem) => void;
}) {
  const [acoes, setAcoes] = useState(false);
  const src = `/chat/midias/${m.id}?numero=${m.numero}`;
  const semFundo = m.tipo === "figurinha";

  return (
    <li
      className={`group flex flex-col ${m.deMim ? "items-end" : "items-start"}`}
      data-testid="mensagem"
      data-tipo={m.tipo}
    >
      <div
        className={`flex max-w-[85%] items-end gap-1 sm:max-w-[70%] ${m.deMim ? "flex-row-reverse" : ""}`}
      >
        <div
          className={`relative flex min-w-0 flex-col gap-1.5 rounded-2xl text-[0.95rem] ${
            semFundo
              ? ""
              : m.deMim
                ? "rounded-br-md bg-linear-to-b from-[#5b2bc4] to-[#4c1fa8] px-3.5 py-2 text-white"
                : "superficie rounded-bl-md px-3.5 py-2"
          }`}
        >
          {m.citada && (
            <p className="border-ouro/70 line-clamp-2 rounded-lg border-l-4 bg-black/20 px-2 py-1 text-xs opacity-90">
              {m.citada.texto || "Mensagem"}
            </p>
          )}
          <Conteudo m={m} src={src} />
          <span
            className={`flex items-center justify-end gap-1 text-[0.7rem] ${m.deMim && !semFundo ? "text-white/70" : "text-apagado"}`}
          >
            {m.deMim && m.autor && <span className="mr-1 truncate">{m.autor}</span>}
            <time dateTime={m.enviadaEm}>{horaDaMensagem(m.enviadaEm)}</time>
            {m.deMim && <Situacao situacao={m.situacao} />}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAcoes((a) => !a)}
          aria-label="Ações da mensagem"
          aria-expanded={acoes}
          className="text-apagado hover:text-texto grid size-8 shrink-0 place-items-center rounded-full opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <Icone nome="mais" width={16} height={16} />
        </button>
      </div>
      {reacoes.length > 0 && (
        <span
          className="bg-elevado -mt-1 rounded-full px-2 py-0.5 text-sm ring-1 ring-black/30"
          aria-label={`Reações: ${reacoes.join(" ")}`}
        >
          {reacoes.join(" ")}
        </span>
      )}
      {acoes && (
        <div className="superficie animate-entrar mt-1 flex flex-wrap items-center gap-0.5 rounded-full px-1.5 py-1">
          {REACOES_RAPIDAS.map((emoji) => (
            <Acao
              key={emoji}
              rotulo={`Reagir com ${emoji}`}
              aoClicar={() => {
                aoReagir(m, emoji);
                setAcoes(false);
              }}
            >
              {emoji}
            </Acao>
          ))}
          <Acao
            rotulo="Responder"
            aoClicar={() => {
              aoResponder(m);
              setAcoes(false);
            }}
          >
            <Icone nome="responder" width={17} height={17} />
          </Acao>
          {m.tipo === "figurinha" && !m.deMim && (
            <Acao
              rotulo="Enviar esta figurinha"
              aoClicar={() => {
                aoReenviarFigurinha(m);
                setAcoes(false);
              }}
            >
              <Icone nome="repetir" width={17} height={17} />
            </Acao>
          )}
        </div>
      )}
    </li>
  );
}
