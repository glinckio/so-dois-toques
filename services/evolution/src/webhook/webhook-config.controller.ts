import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { InternalApiGuard } from "../common/guards/internal-api.guard";
import { EvolutionClientService } from "../evolution-client/evolution-client.service";
import { SetWebhookDto } from "./dto/set-webhook.dto";
import { WebhookEventsService } from "./webhook-events.service";
import { map } from "rxjs";

function ensureConfig(evolution: EvolutionClientService): void {
  if (!evolution.hasConfig()) throw new BadRequestException("EVOLUTION_API_URL must be set");
}

@Controller("internal/evolution")
export class WebhookConfigController {
  constructor(
    private readonly evolution: EvolutionClientService,
    private readonly webhookEvents: WebhookEventsService,
  ) {}

  @Post("webhook/set")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async setWebhook(@Body() dto: SetWebhookDto) {
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/webhook/set/${encodeURIComponent(dto.instanceName)}`, {
      webhook: {
        url: dto.url,
        enabled: dto.enabled,
        webhookByEvents: dto.webhookByEvents,
        webhookBase64: dto.webhookBase64,
        events: dto.events,
      },
    });
  }

  @Get("webhook/find/:instanceName")
  @UseGuards(InternalApiGuard)
  async findWebhook(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.get<unknown>(`/webhook/find/${encodeURIComponent(instanceName)}`);
  }

  /** Stream de eventos recebidos pelo webhook (SSE). Clientes recebem MESSAGES_UPSERT, etc., sem polling. */
  @Sse("events/stream")
  @UseGuards(InternalApiGuard)
  streamEvents() {
    return this.webhookEvents.getStream().pipe(
      map(
        (e) =>
          ({
            data: typeof e.data === "object" ? JSON.stringify(e.data) : e.data,
          }) as MessageEvent,
      ),
    );
  }
}
