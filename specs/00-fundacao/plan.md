# Etapa 0: Plano técnico

## Stack

| Camada    | Escolha                                                                                 |
| --------- | --------------------------------------------------------------------------------------- |
| Aplicação | Next.js 16 (App Router), React 19, TypeScript estrito                                   |
| Estilo    | Tailwind CSS 4                                                                          |
| Banco     | PostgreSQL 16, Prisma 7 com adapter `pg`                                                |
| Validação | Zod (variáveis de ambiente agora; formulários nas próximas etapas)                      |
| Testes    | Vitest (projetos `unit` e `integration`), Playwright (celular Pixel 7 e desktop Chrome) |
| Qualidade | ESLint, Prettier, cobertura mínima de 80%                                               |
| CI        | GitHub Actions, CodeQL, gitleaks, `pnpm audit`, Dependabot                              |

## Decisões

- **CSP com nonce por requisição** em `src/proxy.ts`: nada inline roda sem o nonce em produção. Por isso as páginas renderizam por requisição (`await connection()`), o que é adequado a um sistema logado.
- **Cabeçalhos fixos** (HSTS, nosniff, X-Frame-Options etc.) em `src/lib/security/headers.ts`, aplicados pelo `next.config.ts`.
- **Variáveis de ambiente** validadas em `src/env.ts`; o erro cita só o nome da variável.
- **Prisma 7 fixado em 7.10.0**: a tag `latest` do CLI no npm aponta para uma versão release candidate (8.0.0-rc); usamos a estável.
- **Health check** em `/api/health` usa `SELECT 1` e devolve só `ok` ou `indisponivel`.
- **Rastreabilidade spec → teste**: `scripts/check-spec-coverage.ts` lê os IDs `XXX-CA-NN` das specs e exige que cada um apareça no nome de algum teste.
- **Auditoria de dependências**: vulnerabilidade alta em dependência de produção bloqueia o PR (`pnpm audit --prod`). Correções transitivas via `overrides` em `pnpm-workspace.yaml` (lodash, mysql2, deepmerge-ts). Ferramentas de desenvolvimento são auditadas e reportadas sem bloquear, porque algumas não têm correção publicada (ex.: `braces` via `eslint-config-next`).
- Sem modelos no `schema.prisma` nesta etapa; o primeiro modelo entra na Etapa 1.

## Estrutura

```
specs/NN-nome/        spec.md, plan.md, tasks.md de cada etapa
src/app/              páginas e rotas
src/lib/              regras e utilitários (testáveis sem banco)
src/env.ts            validação das variáveis de ambiente
src/proxy.ts          CSP com nonce
prisma/               schema e migrações
e2e/                  testes ponta a ponta
scripts/              scripts de verificação usados no CI
```

## Riscos

- Next.js 16 e Prisma 7 são versões recentes; documentação local em `node_modules/next/dist/docs/` é a referência.
- CSP estrita pode bloquear bibliotecas de terceiros no futuro; qualquer exceção deve ser justificada na spec da etapa.
