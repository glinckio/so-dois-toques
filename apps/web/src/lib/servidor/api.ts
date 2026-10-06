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
};

const MENSAGEM_FALHA = "Não foi possível falar com o servidor. Tente de novo em instantes.";

/** Chamada do servidor do Next.js para a API (o navegador nunca fala com a API). */
export async function chamarApi<T>(rota: string, opcoes: Opcoes = {}): Promise<RespostaApi<T>> {
  const { API_URL, INTERNAL_API_KEY } = envServidor();
  const comSessao = opcoes.sessao ?? true;
  const cabecalhosEntrada = await headers();
  const cabecalhos: Record<string, string> = { "X-Chave-Interna": INTERNAL_API_KEY };
  const ip = ipDoCliente(cabecalhosEntrada);
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
      signal: AbortSignal.timeout(10_000),
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
