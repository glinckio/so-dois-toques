"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  buscarContatos,
  salvarContato,
  verificarNumero,
  type ContatosDaBusca,
} from "@/app/acoes/chat";
import { Avatar } from "@/components/base/avatar";
import { Carregando } from "@/components/base/bola";
import { Icone } from "@/components/icones";
import {
  Aviso,
  classeBotao,
  classeBotaoIcone,
  classeBotaoSecundario,
  classeCampo,
  classeRotulo,
} from "@/components/ui";
import { formatarNumero } from "@/lib/chat/conversa";

type Escolha = { numero: string; nome: string | null };

const VAZIO: ContatosDaBusca = { alunos: [], salvos: [], whatsapp: [] };

function Grupo({
  titulo,
  itens,
  aoEscolher,
  ocupado,
}: {
  titulo: string;
  itens: { numero: string; nome: string | null; detalhe?: string }[];
  aoEscolher: (e: Escolha) => void;
  ocupado: string | null;
}) {
  if (itens.length === 0) return null;
  return (
    <section aria-label={titulo} className="flex flex-col gap-1">
      <h3 className="text-apagado px-2 pt-2 text-xs font-bold tracking-[0.12em] uppercase">
        {titulo}
      </h3>
      <ul className="flex flex-col">
        {itens.map((c) => (
          <li key={`${titulo}-${c.numero}`}>
            <button
              type="button"
              onClick={() => aoEscolher({ numero: c.numero, nome: c.nome })}
              disabled={ocupado !== null}
              data-testid="contato"
              className="hover:bg-elevado/70 flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left disabled:opacity-60"
            >
              <Avatar nome={c.nome ?? c.numero} tamanho="p" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {c.nome ?? formatarNumero(c.numero)}
                </span>
                <span className="text-apagado block truncate text-xs">
                  {formatarNumero(c.numero)}
                  {c.detalhe && ` · ${c.detalhe}`}
                </span>
              </span>
              {ocupado === c.numero && <Carregando />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * CHAT-CA-11 e 14: janela de nova conversa. Escolher um contato existente (alunos,
 * contatos salvos e do WhatsApp, com busca) ou adicionar um na hora (nome e número).
 * Número sem WhatsApp é avisado e não abre.
 */
export function NovaConversa({ aoAbrir }: { aoAbrir: (e: Escolha) => void }) {
  const janela = useRef<HTMLDialogElement>(null);
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<ContatosDaBusca>(VAZIO);
  const [carregando, setCarregando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [aberta, setAberta] = useState(false);

  // Busca enquanto digita, com uma pequena espera para não pedir a cada tecla.
  useEffect(() => {
    if (!aberta) return;
    let cancelada = false;
    const relogio = setTimeout(async () => {
      setCarregando(true);
      const r = await buscarContatos(busca);
      if (cancelada) return;
      setCarregando(false);
      if (r.ok) setLista(r.dados);
      else setAviso(r.mensagem);
    }, 250);
    return () => {
      cancelada = true;
      clearTimeout(relogio);
    };
  }, [busca, aberta]);

  function abrirJanela() {
    setAviso(null);
    setBusca("");
    setAdicionando(false);
    setAberta(true);
    janela.current?.showModal();
  }

  function fechar() {
    janela.current?.close();
  }

  async function escolher(e: Escolha) {
    setAviso(null);
    setOcupado(e.numero);
    const r = await verificarNumero(e.numero);
    setOcupado(null);
    if (!r.ok) return setAviso(r.mensagem);
    if (!r.dados.existe) return setAviso("Este número não tem WhatsApp.");
    fechar();
    aoAbrir({ numero: r.dados.numero, nome: e.nome });
  }

  async function adicionar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setAviso(null);
    const form = new FormData(evento.currentTarget);
    const nome = String(form.get("nome") ?? "").trim();
    const numero = String(form.get("numero") ?? "");
    setOcupado("novo");
    const r = await salvarContato(nome, numero);
    setOcupado(null);
    if (!r.ok) return setAviso(r.mensagem);
    fechar();
    aoAbrir(r.dados);
  }

  const total = lista.alunos.length + lista.salvos.length + lista.whatsapp.length;

  return (
    <>
      <button
        type="button"
        className={`${classeBotaoSecundario} !min-h-10 text-sm`}
        onClick={abrirJanela}
      >
        <Icone nome="mais" width={16} height={16} />
        Nova conversa
      </button>
      <dialog
        ref={janela}
        aria-labelledby="titulo-nova-conversa"
        onClose={() => setAberta(false)}
        className="superficie open:animate-surgir text-texto m-auto flex max-h-[min(40rem,calc(100dvh-2rem))] w-[min(30rem,calc(100vw-2rem))] flex-col rounded-[1.75rem] p-0 backdrop:bg-black/60 [&:not([open])]:hidden"
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-5">
          <h2 id="titulo-nova-conversa" className="text-xl font-bold">
            Nova conversa
          </h2>
          <button type="button" className={classeBotaoIcone} aria-label="Fechar" onClick={fechar}>
            <Icone nome="fechar" width={18} height={18} />
          </button>
        </header>

        {adicionando ? (
          <form
            onSubmit={adicionar}
            aria-label="Adicionar contato"
            className="flex flex-col gap-4 px-5 pt-4 pb-5"
          >
            {aviso && <Aviso tipo="erro">{aviso}</Aviso>}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contato-nome" className={classeRotulo}>
                Nome
              </label>
              <input
                id="contato-nome"
                name="nome"
                required
                maxLength={120}
                autoComplete="off"
                placeholder="Ex.: Mãe da Júlia"
                className={classeCampo}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contato-numero" className={classeRotulo}>
                WhatsApp com DDD
              </label>
              <input
                id="contato-numero"
                name="numero"
                required
                inputMode="tel"
                autoComplete="off"
                placeholder="(51) 99999-8888"
                className={classeCampo}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={classeBotaoSecundario}
                onClick={() => {
                  setAviso(null);
                  setAdicionando(false);
                }}
              >
                Voltar
              </button>
              <button type="submit" className={classeBotao} disabled={ocupado !== null}>
                {ocupado === "novo" && <Carregando />}
                Salvar e conversar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
            <div className="flex flex-col gap-3 px-5">
              <label htmlFor="busca-contato" className="sr-only">
                Buscar contato
              </label>
              <input
                id="busca-contato"
                type="search"
                autoFocus
                placeholder="Buscar por nome ou número"
                value={busca}
                onChange={(e) => setBusca(e.currentTarget.value)}
                className={classeCampo}
              />
              <button
                type="button"
                onClick={() => {
                  setAviso(null);
                  setAdicionando(true);
                }}
                className="border-roxo/40 bg-roxo/10 hover:bg-roxo/20 text-roxo-claro flex items-center gap-3 rounded-2xl border border-dashed px-3 py-2.5 text-left font-semibold"
              >
                <span className="bg-roxo/20 grid size-8 place-items-center rounded-full">
                  <Icone nome="mais" width={16} height={16} />
                </span>
                Adicionar contato
              </button>
              {aviso && <Aviso tipo="erro">{aviso}</Aviso>}
            </div>
            <div className="min-h-40 flex-1 overflow-y-auto px-3 pb-4">
              {carregando && total === 0 ? (
                <div className="grid place-items-center py-8">
                  <Carregando tamanho={24} />
                </div>
              ) : total === 0 ? (
                <p className="text-apagado px-2 py-8 text-center text-sm">
                  Nenhum contato encontrado. Use <strong>Adicionar contato</strong>.
                </p>
              ) : (
                <>
                  <Grupo
                    titulo="Alunos"
                    itens={lista.alunos.map((a) => ({ ...a, detalhe: "Aluno" }))}
                    aoEscolher={escolher}
                    ocupado={ocupado}
                  />
                  <Grupo
                    titulo="Contatos salvos"
                    itens={lista.salvos}
                    aoEscolher={escolher}
                    ocupado={ocupado}
                  />
                  <Grupo
                    titulo="Contatos do WhatsApp"
                    itens={lista.whatsapp}
                    aoEscolher={escolher}
                    ocupado={ocupado}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
