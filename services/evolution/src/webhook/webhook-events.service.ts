import { Injectable } from "@nestjs/common";
import { Subject, interval, merge, map } from "rxjs";

/**
 * Serviço que repassa eventos recebidos pelo webhook (Evolution API) para
 * clientes conectados via Server-Sent Events. Evita polling no frontend.
 */
@Injectable()
export class WebhookEventsService {
  private readonly subject = new Subject<Record<string, unknown>>();

  /** Envia um evento para todos os clientes SSE conectados. */
  broadcast(payload: Record<string, unknown>): void {
    this.subject.next(payload);
  }

  /**
   * Retorna um Observable que emite eventos no formato SSE.
   * Inclui keepalive a cada 30s para manter a conexão viva.
   */
  getStream() {
    const keepalive = interval(30_000).pipe(
      map(() => ({ data: { type: "keepalive", ts: Date.now() } })),
    );
    return merge(this.subject.pipe(map((payload) => ({ data: payload }))), keepalive);
  }
}
