import { Injectable } from "@nestjs/common";
import { Observable, share } from "rxjs";
import { EvolutionCliente } from "./evolution.cliente.js";
import { eventoDoWebhook, lerBlocosSse, type EventoChat } from "./regras.js";

const RECONECTAR_MS = 3_000;

const esperar = (ms: number, sinal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const relogio = setTimeout(resolve, ms);
    sinal.addEventListener("abort", () => {
      clearTimeout(relogio);
      resolve();
    });
  });

/**
 * CHAT-CA-08: uma só conexão com o stream do microserviço, aberta enquanto houver
 * alguém com o Chat aberto, repassando os eventos já traduzidos. Se cair, reconecta.
 */
@Injectable()
export class EventosDoChat {
  readonly eventos$: Observable<EventoChat>;

  constructor(private readonly evolution: EvolutionCliente) {
    this.eventos$ = new Observable<EventoChat>((assinante) => {
      const controle = new AbortController();
      void this.ouvir(controle.signal, (evento) => assinante.next(evento));
      return () => controle.abort();
    }).pipe(share());
  }

  private async ouvir(sinal: AbortSignal, emitir: (evento: EventoChat) => void) {
    const decodificador = new TextDecoder();
    while (!sinal.aborted) {
      try {
        const corpo = await this.evolution.abrirEventos(sinal);
        let buffer = "";
        for await (const pedaco of corpo) {
          buffer += decodificador.decode(pedaco, { stream: true });
          const { dados, resto } = lerBlocosSse(buffer);
          buffer = resto;
          for (const dado of dados) {
            let payload: unknown;
            try {
              payload = JSON.parse(dado);
            } catch {
              continue;
            }
            const evento = eventoDoWebhook(payload, this.evolution.instancia);
            if (evento) emitir(evento);
          }
        }
      } catch {
        // Microserviço fora do ar ou conexão cortada: tenta de novo daqui a pouco.
      }
      await esperar(RECONECTAR_MS, sinal);
    }
  }
}
