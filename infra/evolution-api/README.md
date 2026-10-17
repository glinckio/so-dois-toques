# Servidor Evolution API (WhatsApp)

Servidor [Evolution API v2](https://doc.evolution-api.com/v2/pt) que conecta o número de WhatsApp da escola. O sistema não fala com ele direto: a API chama o microserviço [`services/evolution`](../../services/evolution), que chama este servidor.

```
navegador → Next.js → API → microserviço (services/evolution) → Evolution (este) → WhatsApp
                                     ↑ webhook com token ←───────────┘
```

## Versão e correção de LID

A imagem é a **v2.3.7 oficial** com o [`lid-fix.patch`](lid-fix.patch) aplicado no build (o `Dockerfile` baixa a tag e aplica o patch). O patch vem do PR [#2450](https://github.com/EvolutionAPI/evolution-api/pull/2450), ainda aberto no projeto original:

- contatos e mensagens que chegam como `@lid` passam a usar o número de telefone;
- o histórico sincronizado ao conectar fica limitado aos últimos 60 dias;
- áudio de voz aceita resposta citando mensagem; mensagem pode sair marcada como encaminhada;
- o nome e a versão do cliente em "Aparelhos conectados" vêm do `.env`.

Quando o PR entrar numa versão oficial, troque `EVOLUTION_TAG` no `Dockerfile` e apague o patch.

## Subir

```bash
cd infra/evolution-api
cp .env.example .env   # troque AUTHENTICATION_API_KEY e POSTGRES_PASSWORD (também na DATABASE_CONNECTION_URI)
docker compose up -d --build
```

Depois, o microserviço (`services/evolution/.env`, `EVOLUTION_API_KEY` = `AUTHENTICATION_API_KEY`) e a API (`apps/api/.env`, `EVOLUTION_URL` e `EVOLUTION_CHAVE`). O número é conectado pela tela **Chat > Conexão** do sistema, lendo o QR code no celular da escola.

## Segurança

- O banco e o Redis do Evolution ficam só na rede interna do compose; a porta 8080 só em `127.0.0.1`. Não exponha este servidor nem o microserviço na internet.
- As conversas ficam no PostgreSQL do Evolution (volume `postgres_data`); faça backup dele junto com o do sistema.
