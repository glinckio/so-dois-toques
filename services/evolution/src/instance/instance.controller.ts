import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InternalApiGuard } from "../common/guards/internal-api.guard";
import { EvolutionClientService } from "../evolution-client/evolution-client.service";
import { CreateInstanceDto, WEBHOOK_EVENTS } from "./dto/create-instance.dto";
import { urlDoWebhook } from "../webhook/url";

@Controller("internal/evolution")
export class InstanceController {
  constructor(
    private readonly evolution: EvolutionClientService,
    private readonly config: ConfigService,
  ) {}

  @Post("instance")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async createInstance(@Body() dto: CreateInstanceDto) {
    if (!this.evolution.hasConfig()) {
      throw new BadRequestException("EVOLUTION_API_URL must be set");
    }
    const webhookUrl = urlDoWebhook(
      this.config.get<string>("API_PUBLIC_URL"),
      this.config.get<string>("WEBHOOK_TOKEN"),
    );
    const webhook =
      dto.webhook ??
      (webhookUrl
        ? {
            url: webhookUrl,
            enabled: true,
            webhookByEvents: false,
            webhookBase64: false,
            events: [...WEBHOOK_EVENTS],
          }
        : undefined);
    const payload = {
      instanceName: dto.instanceName,
      integration: dto.integration,
      ...(dto.token != null && { token: dto.token }),
      ...(dto.qrcode != null && { qrcode: dto.qrcode }),
      ...(dto.number != null && { number: dto.number }),
      ...(dto.rejectCall != null && { rejectCall: dto.rejectCall }),
      ...(dto.msgCall != null && { msgCall: dto.msgCall }),
      ...(dto.groupsIgnore != null && { groupsIgnore: dto.groupsIgnore }),
      ...(dto.alwaysOnline != null && { alwaysOnline: dto.alwaysOnline }),
      ...(dto.readMessages != null && { readMessages: dto.readMessages }),
      ...(dto.readStatus != null && { readStatus: dto.readStatus }),
      ...(dto.syncFullHistory != null && { syncFullHistory: dto.syncFullHistory }),
      ...(webhook != null && { webhook }),
    };
    return this.evolution.post<unknown>("/instance/create", payload);
  }

  @Get("instance/connection-state/:instanceName")
  @UseGuards(InternalApiGuard)
  async getConnectionState(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    return this.evolution.get<unknown>(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );
  }

  /** v2: GET retorna pairingCode/code (QR ou link). */
  @Get("instance/connect/:instanceName")
  @UseGuards(InternalApiGuard)
  async connect(@Param("instanceName") instanceName: string, @Query("number") number?: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    const params = number ? { number } : undefined;
    return this.evolution.get<unknown>(
      `/instance/connect/${encodeURIComponent(instanceName)}`,
      params,
    );
  }

  @Put("instance/restart/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async restart(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    return this.evolution.put<unknown>(`/instance/restart/${encodeURIComponent(instanceName)}`);
  }

  @Delete("instance/logout/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    return this.evolution.delete<unknown>(`/instance/logout/${encodeURIComponent(instanceName)}`);
  }

  @Get("instance/fetchInstances")
  @UseGuards(InternalApiGuard)
  async fetchInstances(
    @Query("instanceName") instanceName?: string,
    @Query("instanceId") instanceId?: string,
  ) {
    const params: Record<string, string> = {};
    if (instanceName) params.instanceName = instanceName;
    if (instanceId) params.instanceId = instanceId;
    return this.evolution.get<unknown>(
      "/instance/fetchInstances",
      Object.keys(params).length ? params : undefined,
    );
  }

  @Delete("instance/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async deleteInstance(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    return this.evolution.delete<unknown>(`/instance/delete/${encodeURIComponent(instanceName)}`);
  }

  @Post("instance/setPresence/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async setPresence(
    @Param("instanceName") instanceName: string,
    @Body() body: { presence?: "composing" | "recording" | "paused"; delay?: number },
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    return this.evolution.post<unknown>(
      `/instance/setPresence/${encodeURIComponent(instanceName)}`,
      body ?? {},
    );
  }
}
