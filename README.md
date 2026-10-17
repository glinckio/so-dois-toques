# Só Dois Toques

Sistema de gestão do Só Dois Toques: aulas, alunos e mensalidades, agenda da única quadra e painel contábil.

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

### Chat do WhatsApp (opcional)

O Chat usa dois serviços a mais: o servidor Evolution API ([`infra/evolution-api`](infra/evolution-api/README.md), em Docker) e o microserviço [`services/evolution`](services/evolution/README.md). Sem eles (`EVOLUTION_URL` vazio na API), o sistema funciona normalmente e o Chat avisa que não está configurado.

```bash
cd infra/evolution-api && cp .env.example .env && docker compose up -d --build && cd ../..
cp services/evolution/.env.example services/evolution/.env   # mesmas chaves do Evolution e da API
pnpm --filter @sdt/evolution dev                              # microserviço em :3004
```

## Documentação

- [Manual de uso](docs/manual.md): cada tela, por perfil.
- [Implantação](docs/implantacao.md): hospedagem, variáveis, domínio, primeiro administrador, backup e restauração.
- [LGPD](docs/lgpd.md): dados pessoais guardados, prazos e pedidos dos titulares.
- [Changelog](CHANGELOG.md).
