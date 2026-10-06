# Etapa 1: Plano técnico

## Como o web e a API conversam

O navegador fala **só com o Next.js**. O Next.js (no servidor) chama a API NestJS, que é a única que acessa o banco. Esse padrão (backend for frontend) mantém o cookie de sessão no mesmo domínio do site e deixa a API fechada para o público.

```
navegador ──cookie sdt_sessao──▶ Next.js (servidor) ──Bearer + chave interna──▶ API NestJS ──▶ PostgreSQL
```

- **Chave interna**: toda chamada do Next.js para a API leva o cabeçalho `X-Chave-Interna` com o segredo `INTERNAL_API_KEY`. Sem ele, a API responde 401 (exceto `GET /health`). Só com a chave a API confia no cabeçalho `X-IP-Cliente`, usado no limite por IP e na auditoria.
- **Sessão**: no login a API gera um token aleatório de 32 bytes, guarda só o SHA-256 dele na tabela `Sessao` e devolve o token ao Next.js, que o coloca no cookie `sdt_sessao` (`HttpOnly`, `Secure` em produção, `SameSite=Lax`, validade de 7 dias). Em cada página o Next.js envia o token como `Authorization: Bearer`.
- **Proteção contra CSRF**: Server Actions do Next.js já conferem a origem; o cookie `SameSite=Lax` completa.

## Modelo de dados (Prisma)

| Tabela           | Campos principais                                                                                        | Observações                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `Usuario`        | id (uuid), nome, email (único, minúsculo), perfil, ativo, senhaHash, trocarSenha, criadoEm, atualizadoEm | Nunca apagado                                     |
| `Sessao`         | id, tokenHash (único), usuarioId, criadaEm, ultimoUsoEm, expiraEm, ip, agente                            | Apagada no logout e quando o usuário é desativado |
| `TentativaLogin` | id, email, ip, sucesso, criadaEm                                                                         | Base do bloqueio por e-mail e por IP              |
| `Auditoria`      | id (sequencial), criadaEm, atorId, acao, alvoTipo, alvoId, ip, detalhes (JSON)                           | Gatilho no banco impede UPDATE, DELETE e TRUNCATE |

`perfil` é um enum: `ADMINISTRADOR`, `PROFESSOR`, `ATENDENTE`.

## API (NestJS)

| Rota                                 | Quem                        | O que faz                                               |
| ------------------------------------ | --------------------------- | ------------------------------------------------------- |
| `POST /auth/login`                   | público (com chave interna) | Valida e-mail e senha, aplica bloqueios, cria sessão    |
| `POST /auth/logout`                  | logado                      | Apaga a sessão atual                                    |
| `GET /auth/eu`                       | logado                      | Dados do usuário da sessão                              |
| `POST /auth/senha`                   | logado                      | Troca a própria senha                                   |
| `GET /usuarios`                      | Administrador               | Lista usuários                                          |
| `POST /usuarios`                     | Administrador               | Cria usuário e devolve a senha temporária uma vez       |
| `PATCH /usuarios/:id/perfil`         | Administrador               | Altera o perfil                                         |
| `POST /usuarios/:id/redefinir-senha` | Administrador               | Gera nova senha temporária                              |
| `POST /usuarios/:id/desativar`       | Administrador               | Desativa e encerra as sessões                           |
| `GET /auditoria`                     | Administrador               | Consulta com filtros e paginação                        |
| `GET /acesso/:area`                  | logado                      | Diz se o perfil pode acessar a área (usado pelas telas) |

- **Guardas globais**: `ChaveInternaGuard` → `SessaoGuard` (lê o Bearer, confere validade, usuário ativo e troca de senha obrigatória) → `PerfisGuard` (`@Perfis(...)`; nega com 403 e registra `ACESSO_NEGADO`). `@Publico()` libera login e health.
- **Senhas**: Argon2id (`@node-rs/argon2`, parâmetros mínimos do OWASP: 19 MiB, 2 iterações, paralelismo 1). Para e-mail inexistente a API verifica contra um hash fictício, para o tempo de resposta não denunciar o cadastro.
- **Regras puras** (testadas sem banco): política de senha, cálculo de bloqueio, expiração de sessão, matriz de permissões, geração de senha temporária.
- **Último administrador**: desativar ou rebaixar trava as linhas de administradores ativos (`SELECT ... FOR UPDATE`) dentro da transação.
- **Primeiro administrador**: `pnpm admin:criar` pergunta nome, e-mail e senha no terminal. Para automação (CI e deploy) aceita `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` por variável de ambiente.

## Web (Next.js)

- `/login`, `/trocar-senha`, `/` (início com menu do perfil), `/usuarios`, `/auditoria` e as áreas `/aulas`, `/horarios`, `/estoque`, `/caixa`, `/contabil` (ainda "em breve", mas já protegidas por perfil).
- O `proxy.ts` manda para `/login` quem não tem cookie; a validação real é feita pela API em cada página.
- Variáveis do web validadas com Zod: `API_URL`, `INTERNAL_API_KEY`.

## Testes

- Unidade: regras puras da API e utilitários do web.
- Integração (API + PostgreSQL real, Supertest): todos os critérios de login, sessão, permissão, usuários e auditoria.
- Ponta a ponta (Playwright, web + API + banco): login, troca de senha obrigatória, menu por perfil, acesso negado, gestão de usuários e auditoria.
