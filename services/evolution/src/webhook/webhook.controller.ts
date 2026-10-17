import { Controller, Post, Body, Logger, UseGuards } from "@nestjs/common";
import { WebhookTokenGuard } from "../common/guards/webhook-token.guard";
import { WebhookEventsService } from "./webhook-events.service";
import { semToken } from "./url";

/**
 * Recebe webhooks da Evolution API (QR code, mensagens, connection update, etc.).
 * Sem InternalApiGuard: a Evolution chama com o token do webhook em ?token= (WEBHOOK_TOKEN).
 * Repassa o payload para clientes conectados via SSE (evita polling no frontend).
 *
 * Eventos comuns: QRCODE_UPDATED, CONNECTION_UPDATE, MESSAGES_UPSERT, MESSAGES_UPDATE.
 */
@Controller("evolution/webhook")
@UseGuards(WebhookTokenGuard)
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly events: WebhookEventsService) {}

  @Post()
  async handle(@Body() body: unknown) {
    this.logger.log(this.buildSummaryLog(body));

    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      this.hasLargeBase64Payload(body as Record<string, unknown>)
    ) {
      this.logger.debug(
        "Webhook payload has base64 content and was intentionally omitted from logs.",
      );
    }

    if (body && typeof body === "object" && !Array.isArray(body)) {
      this.events.broadcast(body as Record<string, unknown>);
    }
    return { received: true };
  }

  private buildSummaryLog(body: unknown): string {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return "Webhook received: invalid payload shape";
    }

    const payload = body as Record<string, unknown>;
    const event = this.toStringOrFallback(payload.event, "unknown_event");
    const instance = this.toStringOrFallback(payload.instance, "unknown_instance");
    const destination = semToken(
      this.toStringOrFallback(payload.destination, "unknown_destination"),
    );
    const dateTime = this.toStringOrFallback(payload.date_time, "unknown_datetime");

    return `Webhook received: event=${event} instance=${instance} destination=${destination} date_time=${dateTime}`;
  }

  private hasLargeBase64Payload(payload: Record<string, unknown>): boolean {
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return false;
    }

    const qrcode = (data as Record<string, unknown>).qrcode;
    if (!qrcode || typeof qrcode !== "object" || Array.isArray(qrcode)) {
      return false;
    }

    const base64 = (qrcode as Record<string, unknown>).base64;
    return typeof base64 === "string" && base64.length > 128;
  }

  private toStringOrFallback(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
  }
}
