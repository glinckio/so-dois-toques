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

- **Next.js + NestJS** (decisão do dono em 06/10/2026): o Next.js cuida só das telas; regras de negócio, login e banco ficam na API NestJS. Separa as camadas e permite um app de celular no futuro usando a mesma API. Custo: dois serviços para hospedar (a API não roda na Vercel; vai para Railway, Render ou similar).
- **Banco só na API**: o Prisma e as variáveis de banco vivem em `apps/api`; o web nunca acessa o banco direto.
- **Sem pacote compartilhado ainda**: os contratos entre web e API (schemas Zod compartilhados) entram em `packages/` quando a primeira tela chamar a API, na Etapa 1.

- **CSP com nonce por requisição** em `apps/web/src/proxy.ts`: nada inline roda sem o nonce em produção. Por isso as páginas renderizam por requisição (`await connection()`), o que é adequado a um sistema logado.
- **Cabeçalhos fixos** no web (`apps/web/src/lib/security/headers.ts`, via `next.config.ts`) e Helmet na API (`apps/api/src/setup.ts`, a mesma função usada pelo servidor e pelos testes).
- **Variáveis de ambiente** da API validadas em `apps/api/src/env.ts` ao iniciar; o erro cita só o nome da variável.
- **Prisma 7 fixado em 7.10.0**: a tag `latest` do CLI no npm aponta para uma versão release candidate (8.0.0-rc); usamos a estável.
- **Health check** em `GET /health` da API usa `SELECT 1` e devolve só `ok` ou `indisponivel`.
- **Rastreabilidade spec → teste**: `scripts/check-spec-coverage.ts` lê os IDs `XXX-CA-NN` das specs e exige que cada um apareça no nome de algum teste.
- **Auditoria de dependências**: vulnerabilidade alta em dependência de produção bloqueia o PR (`pnpm audit --prod`). Correções transitivas via `overrides` em `pnpm-workspace.yaml` (lodash, mysql2, deepmerge-ts). Ferramentas de desenvolvimento são auditadas e reportadas sem bloquear, porque algumas não têm correção publicada (ex.: `braces` via `eslint-config-next`).
- Sem modelos no `schema.prisma` nesta etapa; o primeiro modelo entra na Etapa 1.

## Estrutura

```
specs/NN-nome/          spec.md, plan.md, tasks.md de cada etapa
apps/web/               Next.js: telas
  src/app/              páginas
  src/lib/              utilitários das telas
  src/proxy.ts          CSP com nonce
  e2e/                  testes ponta a ponta (Playwright)
apps/api/               NestJS: regras de negócio, login, banco
  src/<modulo>/         um módulo Nest por área (controller, service, regras puras + testes)
  src/env.ts            validação das variáveis de ambiente
  prisma/               schema e migrações
  test/                 testes de integração com PostgreSQL real
scripts/                scripts de verificação usados no CI
```

## Riscos

- Next.js 16, NestJS 12 e Prisma 7 são versões recentes; documentação local em `node_modules/next/dist/docs/` é a referência.
- CSP estrita pode bloquear bibliotecas de terceiros no futuro; qualquer exceção deve ser justificada na spec da etapa.
