/** Iniciais para o avatar: primeira letra do primeiro e do último nome. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0]![0] ?? "";
  const ultima = partes.length > 1 ? (partes.at(-1)![0] ?? "") : "";
  return (primeira + ultima).toLocaleUpperCase("pt-BR");
}

/** Quantas cores de avatar existem (ver `components/base/avatar.tsx`). */
export const CORES_DE_AVATAR = 6;

/** Cor fixa por pessoa: o mesmo nome sempre ganha a mesma cor. */
export function corDoAvatar(nome: string): number {
  let soma = 0;
  for (const letra of nome.trim().toLocaleLowerCase("pt-BR")) {
    soma = (soma * 31 + (letra.codePointAt(0) ?? 0)) % 9973;
  }
  return soma % CORES_DE_AVATAR;
}
