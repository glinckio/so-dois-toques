"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { Conexao, Conversa, Mensagem, PaginaDeMensagens } from "@/lib/chat/conversa";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";

// As regras e a permissão de cada ação ficam na API; aqui só montamos o pedido.

const numero = z.string().regex(/^\d{10,15}$/);
const mensagemId = z.string().regex(/^[A-Za-z0-9_-]{4,64}$/);

type Resultado<T> = { ok: true; dados: T } | { ok: false; mensagem: string };

function resultado<T>(resposta: RespostaApi<T>): Resultado<T> {
  return resposta.ok
    ? { ok: true, dados: resposta.dados }
    : { ok: false, mensagem: resposta.campos?.[0]?.mensagem ?? resposta.mensagem };
}

const invalido = { ok: false as const, mensagem: "Conversa inválida." };

/** CHAT-CA-04 */
export async function carregarConversas(): Promise<Resultado<Conversa[]>> {
  return resultado(await chamarApi<Conversa[]>("/chat/conversas"));
}

/** CHAT-CA-05 */
export async function carregarMensagens(
  n: string,
  pagina = 1,
): Promise<Resultado<PaginaDeMensagens>> {
  if (!numero.safeParse(n).success || !Number.isInteger(pagina) || pagina < 1) return invalido;
  return resultado(
    await chamarApi<PaginaDeMensagens>(`/chat/conversas/${n}/mensagens?pagina=${pagina}`),
  );
}

export async function marcarComoLidas(n: string): Promise<Resultado<{ marcadas: number }>> {
  if (!numero.safeParse(n).success) return invalido;
  return resultado(await chamarApi(`/chat/conversas/${n}/lidas`, { metodo: "POST" }));
}

/** CHAT-CA-06 e 09 */
export async function enviarTexto(
  n: string,
  texto: string,
  citadaId?: string,
): Promise<Resultado<{ mensagem: Mensagem | null; id: string }>> {
  if (!numero.safeParse(n).success) return invalido;
  if (citadaId !== undefined && !mensagemId.safeParse(citadaId).success) return invalido;
  return resultado(
    await chamarApi(`/chat/conversas/${n}/mensagens`, {
      metodo: "POST",
      corpo: { tipo: "texto", texto, ...(citadaId && { citadaId }) },
      tempoMs: 60_000,
    }),
  );
}

export async function reagir(
  n: string,
  alvo: { id: string; deMim: boolean },
  emoji: string,
): Promise<Resultado<{ reagida: boolean }>> {
  if (!numero.safeParse(n).success || !mensagemId.safeParse(alvo.id).success) return invalido;
  return resultado(
    await chamarApi(`/chat/conversas/${n}/reacoes`, {
      metodo: "POST",
      corpo: { mensagemId: alvo.id, deMim: alvo.deMim, emoji },
    }),
  );
}

/** CHAT-CA-11 */
export async function verificarNumero(
  digitado: string,
): Promise<Resultado<{ numero: string; existe: boolean }>> {
  const digitos = digitado.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 15) {
    return { ok: false, mensagem: "Informe o número com DDD." };
  }
  return resultado(await chamarApi(`/chat/numeros/${digitos}`));
}

/** CHAT-CA-03: só o administrador (a API confere). */
export async function conectarWhatsapp(): Promise<Resultado<Conexao>> {
  return resultado(await chamarApi<Conexao>("/chat/conexao", { metodo: "POST", tempoMs: 30_000 }));
}

export async function desconectarWhatsapp(): Promise<EstadoFormulario> {
  const resposta = await chamarApi("/chat/conexao", { metodo: "DELETE" });
  if (!resposta.ok) return { erro: resposta.mensagem };
  refresh();
  return { sucesso: "WhatsApp desconectado do sistema." };
}
