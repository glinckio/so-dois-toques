import "server-only";
import { lerEnvServidor, type EnvServidor } from "@/lib/config/env";

let cache: EnvServidor | undefined;

/** Variáveis do servidor do web, lidas uma vez. */
export function envServidor(): EnvServidor {
  cache ??= lerEnvServidor(process.env);
  return cache;
}
