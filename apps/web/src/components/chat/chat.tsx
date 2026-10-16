"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  carregarConversas,
  carregarMensagens,
  enviarTexto,
  marcarComoLidas,
  reagir,
} from "@/app/acoes/chat";
import { Avatar } from "@/components/base/avatar";
import { Carregando } from "@/components/base/bola";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoIcone, classeBotaoSecundario, classeCampo } from "@/components/ui";
import {
  comSituacao,
  conversasComMensagem,
  filtrarConversas,
  formatarNumero,
  juntarMensagens,
  nomeDaConversa,
  quandoNaLista,
  rotuloDoDia,
  separarReacoes,
  type Conversa,
  type EventoChat,
  type Mensagem,
  type PaginaDeMensagens,
} from "@/lib/chat/conversa";
import { Bolha } from "./bolha";
import { Compositor, type EnvioDeArquivo } from "./compositor";
import { NovaConversa } from "./nova-conversa";

/** CHAT-CA-08: sem eventos ao vivo, a tela consulta de novo a cada tantos segundos. */
const CONSULTA_SEM_EVENTOS_MS = 4_000;

type Pendente = {
  id: string;
  resumo: string;
  estado: "enviando" | "falhou";
  erro?: string;
  enviar: () => Promise<{ ok: true; mensagem: Mensagem | null } | { ok: false; mensagem: string }>;
};

function FotoOuIniciais({ conversa }: { conversa: Conversa }) {
  const [semFoto, setSemFoto] = useState(!conversa.temFoto);
  if (semFoto) return <Avatar nome={nomeDaConversa(conversa)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/chat/fotos/${conversa.numero}`}
      alt=""
      loading="lazy"
      onError={() => setSemFoto(true)}
      className="size-10 shrink-0 rounded-full object-cover"
    />
  );
}

/**
 * CHAT-CA-04 a 11: o chat do WhatsApp. Lista de conversas à esquerda e a conversa aberta
 * à direita (no celular, uma de cada vez). Mensagens novas chegam pelos eventos ao vivo;
 * se a conexão cair, a tela consulta sozinha.
 */
export function Chat({
  conversasIniciais,
  inicial,
  admin,
}: {
  conversasIniciais: Conversa[];
  /** O administrador vê o atalho para a conexão do número. */
  admin: boolean;
  /** Conversa pedida no endereço (?numero=), já carregada pelo servidor. */
  inicial: PaginaDeMensagens | null;
}) {
  const [conversas, setConversas] = useState(() =>
    inicial
      ? conversasIniciais.map((c) => (c.numero === inicial.numero ? { ...c, naoLidas: 0 } : c))
      : conversasIniciais,
  );
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<string | null>(inicial?.numero ?? null);
  const [mensagens, setMensagens] = useState<Mensagem[]>(inicial?.mensagens ?? []);
  const [aluno, setAluno] = useState<{ id: string; nome: string } | null>(inicial?.aluno ?? null);
  const [contato, setContato] = useState<string | null>(inicial?.contato ?? null);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(inicial?.temMais ?? false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [citada, setCitada] = useState<Mensagem | null>(null);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [aoVivo, setAoVivo] = useState(false);
  const [agora, setAgora] = useState(() => new Date());
  const fim = useRef<HTMLDivElement>(null);
  // A conversa aberta para os eventos e as respostas que chegam depois (sem esperar o render).
  const abertaRef = useRef(aberta);
  const mudarAberta = (numero: string | null) => {
    abertaRef.current = numero;
    setAberta(numero);
    window.history.replaceState(null, "", numero ? `/chat?numero=${numero}` : "/chat");
  };

  const rolarParaOFim = () =>
    requestAnimationFrame(() => fim.current?.scrollIntoView({ block: "end" }));

  async function abrir(numero: string, nome?: string | null) {
    mudarAberta(numero);
    setAluno(null);
    setContato(nome ?? null);
    setMensagens([]);
    setCitada(null);
    setErro(null);
    setPendentes([]);
    setCarregando(true);
    const r = await carregarMensagens(numero, 1);
    setCarregando(false);
    if (abertaRef.current !== numero) return;
    if (!r.ok) return setErro(r.mensagem);
    setMensagens(r.dados.mensagens);
    setAluno(r.dados.aluno);
    setContato(r.dados.contato ?? nome ?? null);
    setPagina(1);
    setTemMais(r.dados.temMais);
    rolarParaOFim();
    setConversas((lista) => lista.map((c) => (c.numero === numero ? { ...c, naoLidas: 0 } : c)));
    void marcarComoLidas(numero);
  }

  // A conversa pedida no endereço já vem do servidor: só desce até o fim e marca como lida.
  useEffect(() => {
    if (!inicial) return;
    fim.current?.scrollIntoView({ block: "end" });
    void marcarComoLidas(inicial.numero);
  }, [inicial]);

  const receber = useCallback((evento: EventoChat) => {
    if (evento.tipo === "mensagem") {
      const m = evento.mensagem;
      setConversas((lista) => conversasComMensagem(lista, m, abertaRef.current));
      if (m.numero === abertaRef.current) {
        setMensagens((atuais) => juntarMensagens(atuais, [m]));
        rolarParaOFim();
        if (!m.deMim) void marcarComoLidas(m.numero);
      }
    } else if (evento.tipo === "situacao" && evento.numero === abertaRef.current) {
      setMensagens((atuais) => comSituacao(atuais, evento.mensagemId, evento.situacao));
    }
  }, []);

  // CHAT-CA-08: eventos ao vivo (o navegador reconecta sozinho se cair).
  useEffect(() => {
    const fonte = new EventSource("/chat/eventos");
    fonte.onopen = () => setAoVivo(true);
    fonte.onerror = () => setAoVivo(false);
    fonte.onmessage = (e) => {
      try {
        receber(JSON.parse(e.data) as EventoChat);
      } catch {
        // evento que a tela não entende
      }
    };
    return () => fonte.close();
  }, [receber]);

  // CHAT-CA-08: sem eventos ao vivo, consulta a lista e a conversa aberta de tempos em tempos.
  useEffect(() => {
    const relogio = setInterval(async () => {
      setAgora(new Date());
      if (aoVivo) return;
      const lista = await carregarConversas();
      if (lista.ok) setConversas(lista.dados);
      const numero = abertaRef.current;
      if (!numero) return;
      const r = await carregarMensagens(numero, 1);
      if (r.ok && abertaRef.current === numero) {
        setMensagens((atuais) => {
          const juntas = juntarMensagens(atuais, r.dados.mensagens);
          if (juntas.length !== atuais.length) rolarParaOFim();
          return juntas;
        });
      }
    }, CONSULTA_SEM_EVENTOS_MS);
    return () => clearInterval(relogio);
  }, [aoVivo]);

  async function maisAntigas() {
    if (!aberta) return;
    setCarregando(true);
    const r = await carregarMensagens(aberta, pagina + 1);
    setCarregando(false);
    if (!r.ok) return setErro(r.mensagem);
    setMensagens((atuais) => juntarMensagens(atuais, r.dados.mensagens));
    setPagina(pagina + 1);
    setTemMais(r.dados.temMais);
  }

  async function executar(p: Pendente) {
    setPendentes((lista) => [
      ...lista.filter((x) => x.id !== p.id),
      { ...p, estado: "enviando", erro: undefined },
    ]);
    rolarParaOFim();
    const r = await p.enviar();
    if (!r.ok) {
      setPendentes((lista) =>
        lista.map((x) => (x.id === p.id ? { ...x, estado: "falhou", erro: r.mensagem } : x)),
      );
      return;
    }
    setPendentes((lista) => lista.filter((x) => x.id !== p.id));
    if (r.mensagem) {
      const m = r.mensagem;
      setMensagens((atuais) => juntarMensagens(atuais, [m]));
      setConversas((lista) => conversasComMensagem(lista, m, abertaRef.current));
      rolarParaOFim();
    }
  }

  function enviarMensagemDeTexto(texto: string) {
    if (!aberta) return;
    const numero = aberta;
    const citadaId = citada?.id;
    setCitada(null);
    void executar({
      id: crypto.randomUUID(),
      resumo: texto,
      estado: "enviando",
      enviar: async () => {
        const r = await enviarTexto(numero, texto, citadaId);
        return r.ok
          ? { ok: true, mensagem: r.dados.mensagem }
          : { ok: false, mensagem: r.mensagem };
      },
    });
  }

  function enviarArquivo(envio: EnvioDeArquivo | { tipo: "figurinha"; deMensagemId: string }) {
    if (!aberta) return;
    const numero = aberta;
    const citadaId = citada?.id;
    setCitada(null);
    const resumo =
      "arquivo" in envio
        ? {
            imagem: "📷 Foto",
            video: "🎥 Vídeo",
            documento: "📄 Documento",
            audio: "🎤 Áudio",
            figurinha: "Figurinha",
          }[envio.tipo]
        : "Figurinha";
    void executar({
      id: crypto.randomUUID(),
      resumo,
      estado: "enviando",
      enviar: async () => {
        const form = new FormData();
        form.set("tipo", envio.tipo);
        if ("arquivo" in envio) {
          form.set("arquivo", envio.arquivo);
          if (envio.legenda) form.set("legenda", envio.legenda);
        } else {
          form.set("deMensagemId", envio.deMensagemId);
        }
        if (citadaId) form.set("citadaId", citadaId);
        try {
          const resposta = await fetch(`/chat/enviar/${numero}`, { method: "POST", body: form });
          const corpo = (await resposta.json()) as { mensagem?: Mensagem | string | null };
          if (!resposta.ok) {
            return {
              ok: false,
              mensagem:
                typeof corpo.mensagem === "string" ? corpo.mensagem : "Não foi possível enviar.",
            };
          }
          return {
            ok: true,
            mensagem: typeof corpo.mensagem === "object" ? (corpo.mensagem ?? null) : null,
          };
        } catch {
          return { ok: false, mensagem: "Não foi possível enviar. Confira a internet." };
        }
      },
    });
  }

  async function reagirA(m: Mensagem, emoji: string) {
    if (!aberta) return;
    const r = await reagir(aberta, { id: m.id, deMim: m.deMim }, emoji);
    if (!r.ok) setErro(r.mensagem);
  }

  const visiveis = useMemo(() => filtrarConversas(conversas, busca), [conversas, busca]);
  const conversaAberta = conversas.find((c) => c.numero === aberta) ?? null;
  const { linha, reacoes } = useMemo(() => separarReacoes(mensagens), [mensagens]);
  const titulo = aberta
    ? (aluno?.nome ??
      contato ??
      (conversaAberta ? nomeDaConversa(conversaAberta) : formatarNumero(aberta)))
    : null;

  return (
    <div className="superficie grid h-[calc(100dvh-10rem)] min-h-[24rem] grid-cols-1 overflow-hidden rounded-[1.75rem] lg:h-full lg:min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
      {/* Lista de conversas */}
      <section
        aria-label="Conversas"
        className={`border-borda/70 flex min-h-0 flex-col lg:border-r ${aberta ? "hidden lg:flex" : "flex"}`}
      >
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 px-1 text-lg font-bold">
              Conversas
              <span
                className={`size-2 rounded-full ${aoVivo ? "bg-sucesso" : "bg-areia"}`}
                title={aoVivo ? "Ao vivo" : "Atualizando a cada poucos segundos"}
                aria-label={aoVivo ? "Ao vivo" : "Atualizando a cada poucos segundos"}
                role="img"
              />
            </h2>
            <div className="flex items-center gap-1.5">
              <NovaConversa aoAbrir={(e) => void abrir(e.numero, e.nome)} />
              {admin && (
                <Link
                  href="/chat/conexao"
                  className={`${classeBotaoIcone} !size-10`}
                  aria-label="Conexão do número"
                  title="Conexão do número"
                >
                  <Icone nome="whatsapp" width={18} height={18} />
                </Link>
              )}
            </div>
          </div>
          <label htmlFor="busca-conversa" className="sr-only">
            Buscar conversa
          </label>
          <input
            id="busca-conversa"
            type="search"
            placeholder="Buscar por nome ou número"
            value={busca}
            onChange={(e) => setBusca(e.currentTarget.value)}
            className={`${classeCampo} !min-h-10 text-sm`}
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Lista de conversas">
          {visiveis.length === 0 && (
            <li className="text-apagado px-3 py-6 text-center text-sm">
              {busca ? "Nenhuma conversa encontrada." : "Nenhuma conversa ainda."}
            </li>
          )}
          {visiveis.map((c) => (
            <li key={c.numero}>
              <button
                type="button"
                onClick={() => void abrir(c.numero)}
                aria-current={c.numero === aberta ? "true" : undefined}
                data-testid="conversa"
                className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition ${c.numero === aberta ? "bg-roxo/20" : "hover:bg-elevado/70"}`}
              >
                <FotoOuIniciais conversa={c} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{nomeDaConversa(c)}</span>
                    {c.ultima && (
                      <span
                        className={`shrink-0 text-xs ${c.naoLidas > 0 ? "text-sucesso font-bold" : "text-apagado"}`}
                      >
                        {quandoNaLista(c.ultima.enviadaEm, agora)}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-apagado truncate text-sm">
                      {c.ultima?.deMim && "Você: "}
                      {c.ultima?.resumo}
                    </span>
                    {c.naoLidas > 0 && (
                      <span
                        className="bg-sucesso text-fundo grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold"
                        aria-label={`${c.naoLidas} não lidas`}
                      >
                        {c.naoLidas}
                      </span>
                    )}
                  </span>
                  {c.aluno && <span className="text-roxo-claro text-xs font-semibold">Aluno</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Conversa aberta */}
      <section
        aria-label={titulo ? `Conversa com ${titulo}` : "Conversa"}
        className={`flex min-h-0 flex-col ${aberta ? "flex" : "hidden lg:flex"}`}
      >
        {!aberta ? (
          <div className="text-apagado grid flex-1 place-items-center p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <Icone nome="chat" width={44} height={44} className="text-roxo-claro" />
              <p>Escolha uma conversa ou abra uma nova pelo número.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="border-borda/70 flex items-center gap-3 border-b px-3 py-2.5">
              <button
                type="button"
                className={`${classeBotaoIcone} lg:hidden`}
                aria-label="Voltar para as conversas"
                onClick={() => mudarAberta(null)}
              >
                <Icone nome="voltar" width={18} height={18} />
              </button>
              {conversaAberta ? (
                <FotoOuIniciais conversa={conversaAberta} />
              ) : (
                <Avatar nome={titulo ?? "?"} />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold" data-testid="titulo-conversa">
                  {titulo}
                </h2>
                <p className="text-apagado truncate text-xs">{formatarNumero(aberta)}</p>
              </div>
              {aluno && (
                <Link
                  href={`/aulas/alunos/${aluno.id}`}
                  className={`${classeBotaoSecundario} !min-h-9 text-sm`}
                >
                  Ficha do aluno
                </Link>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
              {temMais && (
                <div className="mb-3 flex justify-center">
                  <button
                    type="button"
                    onClick={maisAntigas}
                    className={`${classeBotaoSecundario} !min-h-9 text-sm`}
                    disabled={carregando}
                  >
                    {carregando && <Carregando />}
                    Carregar mensagens antigas
                  </button>
                </div>
              )}
              {carregando && mensagens.length === 0 && (
                <div className="grid place-items-center py-10">
                  <Carregando tamanho={28} />
                </div>
              )}
              {erro && <Aviso tipo="erro">{erro}</Aviso>}
              <ol className="flex flex-col gap-2" aria-label="Mensagens">
                {linha.map((m, i) => {
                  const dia = rotuloDoDia(m.enviadaEm, agora);
                  const novoDia = i === 0 || rotuloDoDia(linha[i - 1]!.enviadaEm, agora) !== dia;
                  return (
                    <FragmentoComDia key={m.id} dia={novoDia ? dia : null}>
                      <Bolha
                        m={m}
                        reacoes={reacoes.get(m.id) ?? []}
                        aoResponder={setCitada}
                        aoReagir={reagirA}
                        aoReenviarFigurinha={(f) =>
                          enviarArquivo({ tipo: "figurinha", deMensagemId: f.id })
                        }
                      />
                    </FragmentoComDia>
                  );
                })}
                {pendentes.map((p) => (
                  <li key={p.id} className="flex flex-col items-end" data-testid="pendente">
                    <div
                      className={`max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm sm:max-w-[70%] ${p.estado === "falhou" ? "border-perigo/50 bg-perigo/10 border" : "bg-roxo/40"}`}
                    >
                      <p className="break-words whitespace-pre-wrap">{p.resumo}</p>
                      {p.estado === "enviando" ? (
                        <p className="text-apagado mt-1 flex items-center gap-1 text-xs">
                          <Carregando tamanho={12} /> Enviando…
                        </p>
                      ) : (
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-perigo">{p.erro ?? "Não enviada."}</span>
                          <button
                            type="button"
                            className="font-semibold underline"
                            onClick={() => void executar(p)}
                          >
                            Tentar de novo
                          </button>
                          <button
                            type="button"
                            className="text-apagado underline"
                            onClick={() =>
                              setPendentes((lista) => lista.filter((x) => x.id !== p.id))
                            }
                          >
                            Descartar
                          </button>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              <div ref={fim} />
            </div>

            <Compositor
              citada={citada}
              aoCancelarCitacao={() => setCitada(null)}
              aoEnviarTexto={enviarMensagemDeTexto}
              aoEnviarArquivo={enviarArquivo}
            />
          </>
        )}
      </section>
    </div>
  );
}

function FragmentoComDia({ dia, children }: { dia: string | null; children: React.ReactNode }) {
  return (
    <>
      {dia && (
        <li className="my-2 flex justify-center" aria-label={dia}>
          <span className="bg-elevado text-suave rounded-full px-3 py-1 text-xs font-semibold">
            {dia}
          </span>
        </li>
      )}
      {children}
    </>
  );
}
