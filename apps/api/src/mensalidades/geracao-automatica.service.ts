import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { ENV } from "../config.module.js";
import type { Env } from "../env.js";
import { MensalidadesService } from "./mensalidades.service.js";
import { competenciaAtual } from "./regras.js";

const UMA_HORA = 60 * 60 * 1000;

/**
 * MENS-CA-07: gera as mensalidades do mês corrente (São Paulo) na subida da API e a
 * cada hora. Como a geração é idempotente, rodar em várias instâncias não duplica nada.
 */
@Injectable()
export class GeracaoAutomaticaService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(GeracaoAutomaticaService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly mensalidades: MensalidadesService,
  ) {}

  onApplicationBootstrap() {
    if (!this.env.GERACAO_AUTOMATICA) return;
    void this.executar();
    this.timer = setInterval(() => void this.executar(), UMA_HORA);
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  async executar(agora = new Date()) {
    try {
      return await this.mensalidades.gerar(competenciaAtual(agora), null);
    } catch (erro) {
      this.logger.error(`Falha na geração automática de mensalidades: ${String(erro)}`);
      return null;
    }
  }
}
