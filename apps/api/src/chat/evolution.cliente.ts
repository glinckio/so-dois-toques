import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ENV } from "../config.module.js";
import type { Env } from "../env.js";

export const MENSAGEM_NAO_CONFIGURADO = "WhatsApp não configurado.";
const MENSAGEM_FORA = "Não foi possível falar com o WhatsApp. Tente de novo em instantes.";

/** Erro do microserviço com o código HTTP dele (404 = instância ou mensagem não existe). */
export class ErroDoEvolution extends HttpException {
  constructor(
    public readonly statusDoEvolution: number,
    mensagem: string,
  ) {
    super(mensagem, statusDoEvolution >= 500 ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST);
  }
}

type Metodo = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Etapa 20: chamadas ao microserviço do WhatsApp (services/evolution) com a chave interna.
 * A chave não sai do servidor; o navegador nunca fala com o microserviço.
 */
@Injectable()
export class EvolutionCliente {
  constructor(@Inject(ENV) private readonly env: Env) {}

  /** CHAT-CA-12 */
  configurado(): boolean {
    return Boolean(this.env.EVOLUTION_URL && this.env.EVOLUTION_CHAVE);
  }

  get instancia(): string {
    return this.env.EVOLUTION_INSTANCIA;
  }

  private base(): { url: string; chave: string } {
    if (!this.env.EVOLUTION_URL || !this.env.EVOLUTION_CHAVE) {
      throw new ServiceUnavailableException(MENSAGEM_NAO_CONFIGURADO);
    }
    return { url: this.env.EVOLUTION_URL.replace(/\/+$/, ""), chave: this.env.EVOLUTION_CHAVE };
  }

  /** Caminho a partir de `/internal/evolution`. */
  async chamar<T>(
    metodo: Metodo,
    caminho: string,
    opcoes: { corpo?: unknown; consulta?: Record<string, string>; tempoMs?: number } = {},
  ): Promise<T> {
    const { url, chave } = this.base();
    const endereco = new URL(`${url}/internal/evolution${caminho}`);
    for (const [nome, valor] of Object.entries(opcoes.consulta ?? {})) {
      endereco.searchParams.set(nome, valor);
    }
    let resposta: Response;
    try {
      resposta = await fetch(endereco, {
        method: metodo,
        headers: {
          "x-internal-api-key": chave,
          ...(opcoes.corpo !== undefined && { "Content-Type": "application/json" }),
        },
        body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
        signal: AbortSignal.timeout(opcoes.tempoMs ?? 30_000),
      });
    } catch {
      throw new BadGatewayException(MENSAGEM_FORA);
    }
    const texto = await resposta.text();
    let corpo: unknown;
    try {
      corpo = texto ? JSON.parse(texto) : undefined;
    } catch {
      corpo = undefined;
    }
    if (!resposta.ok) {
      // O conteúdo do erro do Evolution não vai para a tela: pode ter dados da conversa.
      throw new ErroDoEvolution(resposta.status, MENSAGEM_FORA);
    }
    return corpo as T;
  }

  /** Stream de eventos do webhook (SSE) do microserviço. */
  async abrirEventos(sinal: AbortSignal): Promise<ReadableStream<Uint8Array>> {
    const { url, chave } = this.base();
    const resposta = await fetch(`${url}/internal/evolution/events/stream`, {
      headers: { "x-internal-api-key": chave, Accept: "text/event-stream" },
      signal: sinal,
    });
    if (!resposta.ok || !resposta.body) throw new BadGatewayException(MENSAGEM_FORA);
    return resposta.body;
  }
}
