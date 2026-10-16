import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO } from "@/lib/acesso/cookie";
import { ipDoCliente } from "@/lib/acesso/ip";
import { envServidor } from "./env";

export type CampoInvalido = { campo: string; mensagem: string };

export type RespostaApi<T> =
  | { ok: true; status: number; dados: T }
  | { ok: false; status: number; mensagem: string; codigo?: string; campos?: CampoInvalido[] };

type Opcoes = {
  metodo?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  corpo?: unknown;
  /** Com sessão (padrão), 401 leva ao login e a troca de senha pendente leva à tela de troca. */
  sessao?: boolean;
  /** Tempo máximo de espera (padrão 10 s); o envio de arquivo do Chat espera mais. */
  tempoMs?: number;
};

const MENSAGEM_FALHA = "Não foi possível falar com o servidor. Tente de novo em instantes.";

/** Chamada do servidor do Next.js para a API (o navegador nunca fala com a API). */
export async function chamarApi<T>(rota: string, opcoes: Opcoes = {}): Promise<RespostaApi<T>> {
  const { API_URL, INTERNAL_API_KEY, IP_SALTOS_CONFIAVEIS } = envServidor();
  const comSessao = opcoes.sessao ?? true;
  const cabecalhosEntrada = await headers();
  const cabecalhos: Record<string, string> = { "X-Chave-Interna": INTERNAL_API_KEY };
  const ip = ipDoCliente(cabecalhosEntrada, IP_SALTOS_CONFIAVEIS);
  if (ip) cabecalhos["X-IP-Cliente"] = ip;
  const agente = cabecalhosEntrada.get("user-agent");
  if (agente) cabecalhos["X-Agente-Cliente"] = agente.slice(0, 300);
  if (opcoes.corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
  if (comSessao) {
    const token = (await cookies()).get(COOKIE_SESSAO)?.value;
    if (!token) redirect("/login");
    cabecalhos["Authorization"] = `Bearer ${token}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(new URL(rota, API_URL), {
      method: opcoes.metodo ?? "GET",
      headers: cabecalhos,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      cache: "no-store",
      signal: AbortSignal.timeout(opcoes.tempoMs ?? 10_000),
    });
  } catch {
    return { ok: false, status: 503, mensagem: MENSAGEM_FALHA };
  }

  const texto = await resposta.text();
  let corpo: unknown;
  try {
    corpo = texto ? JSON.parse(texto) : undefined;
  } catch {
    return { ok: false, status: 502, mensagem: MENSAGEM_FALHA };
  }
  if (resposta.ok) return { ok: true, status: resposta.status, dados: corpo as T };

  const erro = (corpo ?? {}) as { message?: unknown; codigo?: string; campos?: CampoInvalido[] };
  if (comSessao && resposta.status === 401) redirect("/login?expirada=1");
  if (comSessao && erro.codigo === "TROCA_DE_SENHA_OBRIGATORIA") redirect("/trocar-senha");
  return {
    ok: false,
    status: resposta.status,
    mensagem: typeof erro.message === "string" ? erro.message : MENSAGEM_FALHA,
    codigo: erro.codigo,
    campos: erro.campos,
  };
}

/**
 * CHAT-CA-08: abre um stream (Server-Sent Events) da API com a sessão atual, para o
 * route handler repassar ao navegador. Sem sessão, devolve `null`.
 */
export async function abrirStreamDaApi(rota: string, sinal: AbortSignal): Promise<Response | null> {
  const { API_URL, INTERNAL_API_KEY, IP_SALTOS_CONFIAVEIS } = envServidor();
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const cabecalhos: Record<string, string> = {
    "X-Chave-Interna": INTERNAL_API_KEY,
    Authorization: `Bearer ${token}`,
    Accept: "text/event-stream",
  };
  const ip = ipDoCliente(await headers(), IP_SALTOS_CONFIAVEIS);
  if (ip) cabecalhos["X-IP-Cliente"] = ip;
  try {
    return await fetch(new URL(rota, API_URL), {
      headers: cabecalhos,
      signal: sinal,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}
