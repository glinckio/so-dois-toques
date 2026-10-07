const IP_VALIDO = /^[0-9a-fA-F:.]{2,64}$/;

/**
 * IP do visitante para o limite de tentativas e a auditoria. Cada proxy da
 * hospedagem acrescenta ao fim do X-Forwarded-For o IP de quem falou com ele;
 * o começo da lista vem do próprio visitante e pode ser inventado. Por isso o
 * IP confiável é o que está `saltos` posições antes do fim (1 = o último, o
 * que o proxy da hospedagem viu). Sem X-Forwarded-For, usa o X-Real-IP.
 */
export function ipDoCliente(cabecalhos: Pick<Headers, "get">, saltos = 1): string | undefined {
  const lista = (cabecalhos.get("x-forwarded-for") ?? "")
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);
  const ip = lista.length
    ? lista[Math.max(lista.length - saltos, 0)]
    : cabecalhos.get("x-real-ip")?.trim();
  return ip && IP_VALIDO.test(ip) ? ip : undefined;
}
