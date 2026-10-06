import type { EstadoFormulario } from "./estado";

/**
 * Erro que mantém no formulário o que a pessoa já tinha preenchido (o React limpa o
 * formulário depois da ação). Só copia os campos conhecidos: o nome dos campos vem do
 * navegador e não pode virar chave arbitrária.
 */
export function erroComValores(
  estado: EstadoFormulario,
  form: FormData,
  campos: readonly string[],
): EstadoFormulario {
  const valores = new Map<string, string>();
  for (const campo of campos) {
    const valor = form.get(campo);
    if (typeof valor === "string") valores.set(campo, valor);
  }
  return { ...estado, valores: Object.fromEntries(valores) };
}
