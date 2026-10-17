import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError } from "axios";

/**
 * Cliente HTTP para a Evolution API (WhatsApp).
 * Encapsula base URL e autenticação (apikey).
 * Documentação: https://doc.evolution-api.com
 */
@Injectable()
export class EvolutionClientService {
  private readonly logger = new Logger(EvolutionClientService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (this.config.get<string>("EVOLUTION_API_URL") || "").replace(/\/$/, "");
    const apikey = this.config.get<string>("EVOLUTION_API_KEY") || "";

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        ...(apikey && { apikey }),
      },
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (r) => r,
      (err: AxiosError) => {
        if (err.response?.status && err.response.status >= 400) {
          this.logger.warn(
            `Evolution API ${err.config?.method?.toUpperCase()} ${err.config?.url} → ${err.response.status}`,
          );
        }
        return Promise.reject(err);
      },
    );
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * GET genérico para a Evolution API.
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const { data } = await this.client.get<T>(path, { params });
    return data;
  }

  /**
   * POST genérico para a Evolution API.
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await this.client.post<T>(path, body ?? {});
    return data;
  }

  /**
   * PUT genérico para a Evolution API.
   */
  async put<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await this.client.put<T>(path, body ?? {});
    return data;
  }

  /**
   * DELETE genérico para a Evolution API.
   */
  async delete<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await this.client.delete<T>(path, { data: body });
    return data;
  }

  /**
   * Indica se a URL da Evolution API está configurada.
   */
  hasConfig(): boolean {
    return this.baseUrl.length > 0;
  }

  /**
   * Verifica se a requisição falhou por configuração (URL ou apikey).
   */
  isConfigError(err: unknown): boolean {
    if (!this.baseUrl) return true;
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      return (
        status === 401 ||
        status === 404 ||
        (err.code === "ECONNREFUSED" && err.config?.baseURL === this.baseUrl)
      );
    }
    return false;
  }
}
