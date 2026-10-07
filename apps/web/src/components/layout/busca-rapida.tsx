"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icone, type NomeIcone } from "@/components/icones";
import { filtrarBusca, type ItemDaBusca } from "@/lib/base/busca";

const EVENTO = "sdt:abrir-busca";

const ICONE_DO_GRUPO: Record<ItemDaBusca["grupo"], NomeIcone> = {
  "Ações rápidas": "raio",
  Áreas: "grade",
  Atalhos: "seta-cima-direita",
};

/** Botão que abre a busca rápida (o atalho Ctrl+K também abre). */
export function BotaoBusca({ compacto = false }: { compacto?: boolean }) {
  const abrir = () => window.dispatchEvent(new Event(EVENTO));
  if (compacto) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="border-borda bg-elevado/60 text-suave grid size-11 place-items-center rounded-full border"
      >
        <Icone nome="busca" width={19} height={19} />
        <span className="sr-only">Buscar ou ir para</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={abrir}
      className="superficie text-apagado hover:text-suave group flex min-h-12 w-full max-w-md items-center gap-3 rounded-full px-4 text-left transition-colors hover:border-[#3a2f6b]"
    >
      <Icone nome="busca" width={19} height={19} />
      <span className="flex-1">Buscar ou ir para…</span>
      <kbd className="border-borda bg-elevado text-apagado rounded-lg border px-2 py-0.5 font-sans text-xs font-semibold">
        Ctrl K
      </kbd>
    </button>
  );
}

type Opcao = { chave: string; rotulo: string; href: string; grupo: string; icone: NomeIcone };

/**
 * VIVO-CA-03: busca rápida. Lista as áreas e ações do perfil (montadas no servidor),
 * filtra pelo que se digita e abre o item com Enter ou clique. Com a área de Aulas,
 * a última opção busca alunos pelo nome.
 */
export function BuscaRapida({
  itens,
  buscaAlunos,
}: {
  itens: ItemDaBusca[];
  buscaAlunos: boolean;
}) {
  const janela = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [indice, setIndice] = useState(0);
  const idLista = useId();

  const opcoes = useMemo<Opcao[]>(() => {
    const achados: Opcao[] = filtrarBusca(itens, termo).map((i) => ({
      chave: i.href + i.rotulo,
      rotulo: i.rotulo,
      href: i.href,
      grupo: i.grupo,
      icone: i.grupo === "Áreas" ? (i.area as NomeIcone) : ICONE_DO_GRUPO[i.grupo],
    }));
    const texto = termo.trim();
    if (buscaAlunos && texto) {
      achados.push({
        chave: "buscar-alunos",
        rotulo: `Buscar alunos por “${texto}”`,
        href: `/aulas/alunos?busca=${encodeURIComponent(texto)}`,
        grupo: "Alunos",
        icone: "busca",
      });
    }
    return achados;
  }, [itens, termo, buscaAlunos]);

  useEffect(() => {
    const abrir = () => {
      setTermo("");
      setIndice(0);
      janela.current?.showModal();
      campo.current?.focus();
    };
    const teclado = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        if (janela.current?.open) janela.current.close();
        else abrir();
      }
    };
    window.addEventListener(EVENTO, abrir);
    window.addEventListener("keydown", teclado);
    return () => {
      window.removeEventListener(EVENTO, abrir);
      window.removeEventListener("keydown", teclado);
    };
  }, []);

  const ir = (opcao: Opcao | undefined) => {
    if (!opcao) return;
    janela.current?.close();
    router.push(opcao.href);
  };

  const selecionado = Math.min(indice, Math.max(0, opcoes.length - 1));

  return (
    <dialog
      ref={janela}
      aria-label="Busca rápida"
      className="superficie open:animate-surgir text-texto mx-auto mt-[12vh] mb-auto w-[min(36rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.75rem] p-0"
      onClick={(evento) => {
        if (evento.target === janela.current) janela.current?.close();
      }}
    >
      <div className="border-borda flex items-center gap-3 border-b px-5">
        <Icone nome="busca" className="text-roxo-claro shrink-0" />
        <input
          ref={campo}
          type="text"
          role="combobox"
          aria-label="Buscar ou ir para"
          aria-expanded="true"
          aria-controls={idLista}
          aria-activedescendant={opcoes[selecionado] ? `${idLista}-${selecionado}` : undefined}
          autoComplete="off"
          placeholder="Buscar área, ação ou aluno…"
          value={termo}
          onChange={(evento) => {
            setTermo(evento.target.value);
            setIndice(0);
          }}
          onKeyDown={(evento) => {
            if (evento.key === "ArrowDown") {
              evento.preventDefault();
              setIndice((i) => Math.min(i + 1, opcoes.length - 1));
            } else if (evento.key === "ArrowUp") {
              evento.preventDefault();
              setIndice((i) => Math.max(i - 1, 0));
            } else if (evento.key === "Enter") {
              evento.preventDefault();
              ir(opcoes[selecionado]);
            }
          }}
          className="placeholder:text-apagado min-h-16 flex-1 bg-transparent text-lg outline-none"
        />
        <kbd className="border-borda text-apagado rounded-lg border px-2 py-0.5 text-xs font-semibold">
          Esc
        </kbd>
      </div>
      <ul
        id={idLista}
        role="listbox"
        aria-label="Resultados"
        className="max-h-[50vh] overflow-y-auto p-2"
      >
        {opcoes.length === 0 && (
          <li className="text-apagado px-4 py-8 text-center text-sm">Nada encontrado.</li>
        )}
        {opcoes.map((opcao, i) => {
          const titulo = opcao.grupo !== opcoes[i - 1]?.grupo ? opcao.grupo : null;
          const ativo = i === selecionado;
          return (
            <li key={opcao.chave} role="presentation">
              {titulo && (
                <p className="text-apagado px-3 pt-3 pb-1.5 text-[0.68rem] font-bold tracking-[0.16em] uppercase">
                  {titulo}
                </p>
              )}
              <div
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={ativo}
                onMouseMove={() => setIndice(i)}
                onClick={() => ir(opcao)}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 font-semibold transition-colors ${
                  ativo ? "bg-roxo-forte/25 text-texto" : "text-suave"
                }`}
              >
                <span
                  className={`grid size-8 place-items-center rounded-xl ${ativo ? "bg-roxo text-fundo" : "bg-elevado"}`}
                >
                  <Icone nome={opcao.icone} width={16} height={16} />
                </span>
                <span className="flex-1">{opcao.rotulo}</span>
                {ativo && <Icone nome="seta" width={16} height={16} className="text-roxo-claro" />}
              </div>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
