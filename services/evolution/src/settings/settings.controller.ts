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
} from "@nestjs/common";
import { InternalApiGuard } from "../common/guards/internal-api.guard";
import { EvolutionClientService } from "../evolution-client/evolution-client.service";

function ensureConfig(evolution: EvolutionClientService): void {
  if (!evolution.hasConfig()) throw new BadRequestException("EVOLUTION_API_URL must be set");
}

@Controller("internal/evolution")
export class SettingsController {
  constructor(private readonly evolution: EvolutionClientService) {}

  @Post("settings/set/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async setSettings(
    @Param("instanceName") instanceName: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/settings/set/${encodeURIComponent(instanceName)}`, body);
  }

  @Get("settings/find/:instanceName")
  @UseGuards(InternalApiGuard)
  async findSettings(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.get<unknown>(`/settings/find/${encodeURIComponent(instanceName)}`);
  }
}
