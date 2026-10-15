/** Máscaras dos campos de digitação. Funções puras: recebem o texto, devolvem o texto formatado. */

const apenasDigitos = (texto: string) => texto.replace(/\D/g, "");

/**
 * AJU-CA-02: telefone brasileiro com DDD, montado enquanto se digita. Até 10 dígitos
 * fica no formato do fixo, "(21) 3456-7890"; com 11, no do celular, "(21) 99876-5432".
 * Um número colado com o código do país ("+55 21 ...") perde o 55.
 */
export function mascararTelefone(texto: string): string {
  const todos = apenasDigitos(texto);
  const d = (todos.length > 11 && todos.startsWith("55") ? todos.slice(2) : todos).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = `(${d.slice(0, 2)}) `;
  if (d.length <= 6) return ddd + d.slice(2);
  const meio = d.length === 11 ? 7 : 6;
  return `${ddd}${d.slice(2, meio)}-${d.slice(meio)}`;
}

/** Até R$ 999.999.999,99: o bastante para o caixa e longe do limite de um inteiro seguro. */
const MAXIMO_DE_DIGITOS_EM_REAIS = 11;

/**
 * AJU-CA-03: valor em reais que só aceita números e se preenche pelos centavos, como
 * numa maquininha: digitar 1, 2, 3 e 4 mostra "12,34". Letras e sinais são ignorados.
 * O resultado é o formato que o servidor já entende ("1.234,56").
 */
export function mascararReais(texto: string): string {
  const d = apenasDigitos(texto).replace(/^0+/, "").slice(0, MAXIMO_DE_DIGITOS_EM_REAIS);
  if (d.length === 0) return "";
  const completo = d.padStart(3, "0");
  const reais = completo.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${reais},${completo.slice(-2)}`;
}

/**
 * Onde o cursor fica depois da máscara: logo depois do mesmo dígito em que estava,
 * para quem corrige um número no meio não ser jogado para o fim do campo.
 * `daDireita` conta os dígitos a partir do fim (valor em reais cresce pela direita).
 */
export function posicaoDoCursor(
  antes: string,
  cursor: number,
  depois: string,
  daDireita = false,
): number {
  if (daDireita) {
    const digitosDepois = apenasDigitos(antes.slice(cursor)).length;
    let vistos = 0;
    for (let i = depois.length; i > 0; i--) {
      if (vistos === digitosDepois) return i;
      if (/\d/.test(depois[i - 1]!)) vistos++;
    }
    return vistos === digitosDepois ? 0 : depois.length;
  }
  const digitosAntes = apenasDigitos(antes.slice(0, cursor)).length;
  if (digitosAntes === 0) return depois.startsWith("(") ? Math.min(1, depois.length) : 0;
  let vistos = 0;
  for (let i = 0; i < depois.length; i++) {
    if (/\d/.test(depois[i]!)) vistos++;
    if (vistos === digitosAntes) return i + 1;
  }
  return depois.length;
}
