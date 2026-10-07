# Só Dois Toques

Sistema de gestão (aulas, horários das quadras, estoque, caixa, contábil). Usuários e documentação em português do Brasil: specs, commits, PRs e textos de tela em pt-BR.

## Estrutura

Monorepo pnpm:

- `apps/web`: Next.js 16 (telas). Leia `apps/web/AGENTS.md` antes de mexer: a versão do Next.js é mais nova que o seu conhecimento; a documentação está em `apps/web/node_modules/next/dist/docs/`.
- `apps/api`: NestJS 12 em ESM (regras de negócio, login, banco com Prisma 7). Imports relativos com extensão `.js`.
- `specs/`: specs SDD de cada etapa. `scripts/`: verificações do CI.

## Fluxo SDD (obrigatório)

1. Cada etapa tem `specs/NN-nome/spec.md` (com a linha `**Status:** rascunho | aprovada | implementada`) (o quê e por quê, critérios de aceite `XXX-CA-NN`), `plan.md` (como) e `tasks.md`.
2. A spec entra num PR próprio com status `rascunho`; o dono aprova e ela passa a `aprovada` antes do código. O PR de implementação muda para `implementada`.
3. Branch `etapa/NN-nome` a partir da `main`; commits pequenos em Conventional Commits (`feat(aulas): ...`).
4. Todo critério de aceite automatizável aparece no nome de pelo menos um teste (`pnpm check:specs`). Critérios marcados `[manual]` são verificados na revisão.
5. PR para a `main` usando o modelo; CI verde é obrigatório. Nunca desligue, pule ou apague teste para ficar verde.

## Comandos

```bash
pnpm install
docker compose up -d                    # PostgreSQL local
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:deploy && pnpm admin:criar      # banco e primeiro administrador
pnpm db:backup                          # cópia do banco (restauração: pnpm db:restaurar <arquivo> <banco>)
pnpm dev                                # web em :3000, API em :3001

pnpm lint && pnpm format:check && pnpm typecheck
pnpm test                   # unidade (raiz, web e API)
pnpm test:coverage          # unidade com cobertura (mínimo 80%)
pnpm test:integration       # API contra PostgreSQL real (banco *_test recriado)
pnpm build && pnpm test:e2e # web + API + banco *_e2e (celular e desktop)
pnpm check:specs            # todo critério de aceite tem teste
```

## Regras de código

- Dinheiro sempre em centavos inteiros; datas em America/Sao_Paulo.
- Toda entrada de usuário validada com Zod no servidor; checagem de permissão no servidor.
- Lançamentos financeiros nunca são apagados ou editados: erro se corrige com estorno.
- Nada de segredos no repositório; novas variáveis da API entram em `apps/api/src/env.ts` e `apps/api/.env.example` (as do web em `apps/web/src/lib/servidor/env.ts` e `apps/web/.env.example`).
- O navegador só fala com o Next.js; o servidor do Next.js chama a API com a chave interna e o token da sessão (`apps/web/src/lib/servidor/api.ts`). Toda rota nova da API exige sessão por padrão; use `@ExigeArea(...)` para restringir por perfil.
- Regra de negócio na API, como funções puras com teste de unidade (`*.spec.ts`); acesso ao banco nos services. O web nunca acessa o banco.
- Testes de integração da API ficam em `apps/api/test/*.e2e-spec.ts` e rodam contra PostgreSQL real.
