# Só Dois Toques

Sistema de gestão do Só Dois Toques: aulas e mensalidades, horários das quadras de areia, estoque da copa, caixa e painel contábil.

O desenvolvimento segue SDD (spec-driven development): cada etapa tem uma spec em `specs/`, uma branch própria e um PR com CI obrigatório.

Plano de desenvolvimento: https://claude.ai/code/artifact/71167e76-203d-4670-8af0-3f01ec5f8399

## Rodando localmente

Requisitos: Node 22+, pnpm 10 e Docker.

```bash
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:deploy
pnpm admin:criar   # cria o primeiro administrador (pede nome, e-mail e senha)
pnpm dev
```

O site abre em http://localhost:3000 e a API em http://localhost:3001. Em produção, gere uma `INTERNAL_API_KEY` aleatória e use o mesmo valor no web e na API.

Os comandos de teste e o fluxo de trabalho estão em [CLAUDE.md](CLAUDE.md).
