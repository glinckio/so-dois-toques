# Microserviço do WhatsApp (`@sdt/evolution`)

NestJS que fala com o servidor [Evolution API v2](https://doc.evolution-api.com/v2/pt) ([`infra/evolution-api`](../../infra/evolution-api)) e repassa os eventos do webhook. Veio pronto de outro projeto do dono; aqui ganhou variáveis validadas, token no webhook e o lugar no monorepo.

Só a API do sistema chama este serviço (cabeçalho `x-internal-api-key`). O navegador nunca fala com ele.

```
API → /internal/evolution/... (x-internal-api-key) → Evolution
Evolution → POST /evolution/webhook?token=... → SSE /internal/evolution/events/stream → API
```

## Rodar

```bash
cp services/evolution/.env.example services/evolution/.env
pnpm --filter @sdt/evolution dev      # porta 3004
pnpm --filter @sdt/evolution test     # variáveis, chave interna e token do webhook
```

Variáveis (validadas na subida; o erro cita só o nome): `PORT`, `INTERNAL_API_KEY` (32+), `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `WEBHOOK_TOKEN` (32+) e `API_PUBLIC_URL` (para o webhook automático da instância, já com o token).

## Rotas

Todas em `/internal/evolution`, com a chave interna:

- **Instância:** criar, estado da conexão, conectar (QR code), reiniciar, logout, listar, apagar, presença.
- **Mensagens:** texto, mídia, áudio de voz, figurinha, reação, localização, contato, enquete, lista, botões e status.
- **Chat:** números com WhatsApp, marcar como lida ou não lida, arquivar, apagar para todos, presença, bloquear, foto e perfil, contatos, mídia em base64, mensagens (paginadas com `page` e `offset`), conversas, editar mensagem e privacidade.
- **Webhook e configurações** da instância.
- `GET events/stream`: eventos recebidos pelo webhook, em Server-Sent Events.

O sistema usa parte delas (conexão, conversas, mensagens, envio, reação, mídia e eventos); o resto continua disponível.
