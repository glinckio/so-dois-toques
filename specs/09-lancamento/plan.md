# Etapa 9: Plano técnico

## Modelo de dados

Nenhuma tabela nova. A anonimização atualiza `clienteNome` e `clienteTelefone` em `Reserva` e `SerieReserva`. Nova ação de auditoria `CLIENTES_ANONIMIZADOS`.

## Produção

- `apps/api/src/env.ts`: em produção, recusa `INTERNAL_API_KEY` com "troque-por" e `WEB_ORIGIN` sem https (fora localhost e 127.0.0.1).
- `apps/web/src/lib/servidor/env.ts`: a mesma recusa da chave de exemplo.
- `apps/api/test/rotas.e2e-spec.ts`: percorre os controllers registrados (`ModulesContainer` + metadados do Nest) e compara com as listas fixas de rotas abertas e de rotas da própria conta.

## Backup (`apps/api/src/backup/`)

- `regras.ts` (puro): nome do arquivo no horário de São Paulo, separação da senha da URL, URL do banco de destino, validação do nome do banco, comparação de conferências.
- `backup.ts`: `fazerBackup`, `restaurarBackup` e `conferirBanco`, com `pg_dump -Fc` e `pg_restore --no-owner --no-acl`, senha só em `PGPASSWORD`.
- `src/cli/backup.ts` e `src/cli/restaurar.ts`; scripts `pnpm db:backup` e `pnpm db:restaurar` na raiz e na API. `backups/` no `.gitignore`.

## Retenção (API, módulo `horarios`)

| Rota                                   | O que faz                                 |
| -------------------------------------- | ----------------------------------------- |
| `GET /horarios/clientes/anonimizaveis` | Quantas reservas e séries passam do prazo |
| `POST /horarios/clientes/anonimizar`   | Anonimiza (corpo `{ confirmar: true }`)   |

Ambas `@SomenteAdministrador()`. Regra pura `limiteDeRetencao(hoje, meses)` em `horarios/regras.ts`.

## Web

- `/horarios/privacidade` (só administrador): prévia das quantidades e botão com confirmação; link na navegação de Horários para o administrador.

## Documentação

- `docs/lgpd.md`, `docs/manual.md`, `docs/implantacao.md`; README aponta para eles.
- `specs/09-lancamento/revisao-seguranca.md`: o que foi revisado e o que foi corrigido.
- Versão 1.0.0 nos `package.json` e `CHANGELOG.md`.

## Testes

- Unidade: env de produção (API e web), regras do backup, limite de retenção.
- Integração (PostgreSQL): inventário de rotas, backup e restauração de verdade com `pg_dump`/`pg_restore`, recusas da restauração, anonimização e permissões.
- Ponta a ponta: prévia e anonimização pela tela; atendente sem acesso.
