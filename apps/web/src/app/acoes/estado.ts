/** Resposta das Server Actions de formulário, exibida pelo componente com useActionState. */
export type EstadoFormulario = {
  erro?: string;
  sucesso?: string;
  /** Senha temporária mostrada uma única vez (ACESSO-CA-12 e 15). */
  senhaTemporaria?: string;
  email?: string;
  /**
   * O que a pessoa digitou, devolvido quando a ação recusa o formulário: o React limpa
   * o formulário depois da ação, e os campos voltam a esses valores em vez de ficarem vazios.
   */
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoFormulario = {};
