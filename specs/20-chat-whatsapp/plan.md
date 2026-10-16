# Etapa 20: Plano técnico

## Organização

- `services/evolution`: o microserviço (NestJS, `@sdt/evolution`), no workspace do pnpm (`services/*`). Sai `.env`, `dist`, `example/`, `package-lock.json` e as duas cópias do Evolution. Variáveis validadas na subida (`src/env.ts`): `INTERNAL_API_KEY` (mínimo 32), `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `WEBHOOK_TOKEN` (mínimo 32) e `API_PUBLIC_URL`. O webhook (`POST /evolution/webhook`) exige `?token=` igual ao `WEBHOOK_TOKEN` (comparação em tempo constante) e o webhook automático da instância já vai com o token. Logs sem conteúdo de mensagem.
- `infra/evolution-api`: `docker-compose.yml` (Evolution, PostgreSQL e Redis só na rede interna; a porta 8080 só em `127.0.0.1`), `Dockerfile` que baixa a tag oficial `2.3.7` e aplica `lid-fix.patch` antes do build, e `.env.example`.
- A verificação de critérios (`pnpm check:specs`) passa a ler os testes de `services/` também.

## Banco (migration `20261017130000_chat`)

- `MensagemEnviada`: identificador da mensagem no WhatsApp (único), número, usuário e data. É o que mostra "quem da equipe enviou" (CHAT-CA-09).

- `ContatoChat` (migration `20261017140000_contatos_do_chat`): número (chave), nome, quem salvou e datas. Contato adicionado na hora pela janela de nova conversa (CHAT-CA-14).

## Regras puras (`apps/api/src/chat/regras.ts`)

- Números: `jidDoNumero` (DDD + número vira `55…@s.whatsapp.net`), `numeroDoJid` (só conversas individuais; grupo, status e broadcast ficam de fora) e `telefonesParecidos` (com e sem o nono dígito, para achar o aluno).
- `mensagemDoEvolution`: tipo (texto, imagem, vídeo, áudio, documento, figurinha, localização, contato, reação ou não suportada), texto ou legenda, mídia, citação, situação (enviada, entregue, lida) e data.
- `conversaDoEvolution` e `resumoDaMensagem` para a lista.
- `problemaDoArquivo`: tipo aceito por formato e até 10 MB.

## API (`apps/api/src/chat`, área `chat` para administrador e atendente)

- `EvolutionCliente`: chama o microserviço com `x-internal-api-key`; sem `EVOLUTION_URL`, o Chat responde "WhatsApp não configurado".
- Conexão (só administrador): `GET /chat/conexao`, `POST /chat/conexao` (cria a instância se não existir e devolve o QR code), `DELETE /chat/conexao`. Auditoria `WHATSAPP_CONECTADO` e `WHATSAPP_DESCONECTADO`.
- Conversas: `GET /chat/conversas`, `GET /chat/numeros/:numero` (tem WhatsApp?), `GET /chat/conversas/:numero/mensagens?antes=`, `POST /chat/conversas/:numero/lidas`, `POST /chat/conversas/:numero/mensagens` (texto, imagem, vídeo, documento, áudio, figurinha, com citação) e `POST /chat/conversas/:numero/reacoes`. `GET /chat/midias/:mensagemId?numero=` devolve a mídia em base64 só com sessão.
- `GET /chat/eventos` (SSE): a API mantém uma conexão com o stream do microserviço e repassa mensagens novas, mudanças de situação e de conexão, já traduzidas.
- Corpo JSON até 15 MB só nas rotas de envio do chat; o resto continua com o limite padrão.
- Variáveis novas: `EVOLUTION_URL`, `EVOLUTION_CHAVE` e `EVOLUTION_INSTANCIA`.

## Web

- `/chat`: lista de conversas e a conversa aberta (no celular, uma tela de cada vez). `/chat/conexao`: estado, QR code e desconectar.
- Route handlers: `/chat/eventos` (repasse do SSE), `/chat/midias/[id]` (mídia binária, sem cache público), `/chat/fotos/[numero]` (foto de perfil buscada no servidor, só de `*.whatsapp.net`) e `/chat/[numero]/enviar` (arquivo em `multipart`, até 10 MB).
- Gravação de áudio com `MediaRecorder`; seletor de emojis próprio; figurinha a partir de imagem ou de uma recebida.
- `Permissions-Policy` libera `microphone=(self)`; CSP ganha `media-src 'self' blob:`; `proxyClientMaxBodySize` sobe para 11 MB.
- Botão "Conversar no WhatsApp" na ficha do aluno.

## Testes

- Microserviço: variáveis, guarda interna e token do webhook (CHAT-CA-01 e 02).
- Unidade da API: números, tradução das mensagens e conversas, arquivos.
- Integração da API com um microserviço falso (servidor HTTP local): CHAT-CA-03 a 12.
- Ponta a ponta com o microserviço falso: conexão, lista, conversa, envio de texto e mensagem recebida aparecendo sozinha.
