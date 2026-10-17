/** Administrador criado pelo admin:criar antes dos testes ponta a ponta. */
export const ADMIN_E2E = {
  nome: "Administração E2E",
  email: "admin-e2e@exemplo.com",
  senha: "senha-admin-e2e-2026",
};

/** Etapa 20: microserviço do WhatsApp falso que o Playwright sobe para a API (em memória). */
export const EVOLUTION_FALSO = `http://127.0.0.1:${Number(process.env.EVOLUTION_FALSO_PORT ?? 3104)}`;
