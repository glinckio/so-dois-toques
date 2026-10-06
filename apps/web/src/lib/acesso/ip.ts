const IP_VALIDO = /^[0-9a-fA-F:.]{2,64}$/;

/**
 * IP do visitante para o limite de tentativas e a auditoria. Vem do proxy da
 * hospedagem (X-Forwarded-For ou X-Real-IP); o primeiro valor é o do cliente.
 */
export function ipDoCliente(cabecalhos: Pick<Headers, "get">): string | undefined {
  const encaminhado = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = encaminhado || cabecalhos.get("x-real-ip")?.trim();
  return ip && IP_VALIDO.test(ip) ? ip : undefined;
}
