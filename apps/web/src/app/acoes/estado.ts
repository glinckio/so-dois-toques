/** Resposta das Server Actions de formulário, exibida pelo componente com useActionState. */
export type EstadoFormulario = {
  erro?: string;
  sucesso?: string;
  /** Senha temporária mostrada uma única vez (ACESSO-CA-12 e 15). */
  senhaTemporaria?: string;
  email?: string;
};

export const ESTADO_INICIAL: EstadoFormulario = {};
