@AGENTS.md

# Só Dois Toques

Sistema de gestão (aulas, horários das quadras, estoque, caixa, contábil). Usuários e documentação em português do Brasil: specs, commits, PRs e textos de tela em pt-BR.

## Fluxo SDD (obrigatório)

1. Cada etapa tem `specs/NN-nome/spec.md` (com a linha `**Status:** rascunho | aprovada | implementada`) (o quê e por quê, critérios de aceite `XXX-CA-NN`), `plan.md` (como) e `tasks.md`.
2. A spec entra num PR próprio com status `rascunho`; o dono aprova e ela passa a `aprovada` antes do código. O PR de implementação muda para `implementada`.
3. Branch `etapa/NN-nome` a partir da `main`; commits pequenos em Conventional Commits (`feat(aulas): ...`).
4. Todo critério de aceite automatizável aparece no nome de pelo menos um teste (`pnpm check:specs`). Critérios marcados `[manual]` são verificados na revisão.
5. PR para a `main` usando o modelo; CI verde é obrigatório. Nunca desligue, pule ou apague teste para ficar verde.

## Comandos

```bash
pnpm install
docker compose up -d        # PostgreSQL local
cp .env.example .env
pnpm dev                    # http://localhost:3000

pnpm lint && pnpm format:check && pnpm typecheck
pnpm test                   # unidade
pnpm test:coverage          # unidade com cobertura (mínimo 80%)
pnpm test:integration       # integração com PostgreSQL real
pnpm build && pnpm test:e2e # ponta a ponta (celular e desktop)
pnpm check:specs            # todo critério de aceite tem teste
```

## Regras de código

- Dinheiro sempre em centavos inteiros; datas em America/Sao_Paulo.
- Toda entrada de usuário validada com Zod no servidor; checagem de permissão no servidor.
- Lançamentos financeiros nunca são apagados ou editados: erro se corrige com estorno.
- Nada de segredos no repositório; novas variáveis entram em `src/env.ts` e `.env.example`.
- Regra de negócio em `src/lib/` como funções puras com teste de unidade; acesso ao banco separado.
- Arquivos `*.int.test.ts` rodam contra PostgreSQL real.
