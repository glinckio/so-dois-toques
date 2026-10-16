# Implantação em produção

Passo a passo para colocar a versão 1.0.0 no ar. São três partes: o **site** (Next.js, `apps/web`), a **API** (NestJS, `apps/api`) e o **banco** (PostgreSQL 16). O navegador só fala com o site; o site fala com a API usando a chave interna.

Sugestão do plano, de custo baixo e sem servidor para manter: site na **Vercel**, API e banco no **Render** (ou Railway). Qualquer hospedagem com Node 22 e PostgreSQL 16 serve.

## 1. Banco de dados

1. Crie um PostgreSQL 16 gerenciado, na região São Paulo se houver.
2. Ligue o **backup automático diário** da hospedagem (e, se existir, a restauração para um ponto no tempo).
3. Guarde a URL de conexão interna (para a API) e a externa (para rodar comandos da sua máquina). Ela é segredo.

## 2. API

| Configuração   | Valor                                                            |
| -------------- | ---------------------------------------------------------------- |
| Build          | `pnpm install --frozen-lockfile && pnpm --filter @sdt/api build` |
| Antes de subir | `pnpm --filter @sdt/api db:deploy` (aplica as migrations)        |
| Início         | `pnpm --filter @sdt/api start`                                   |
| Verificação    | `GET /health` responde `{"status":"ok","database":"ok"}`         |

Variáveis:

| Variável             | Valor                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | `production`                                                                                            |
| `DATABASE_URL`       | URL interna do banco                                                                                    |
| `WEB_ORIGIN`         | Endereço do site, com https (ex.: `https://sistema.sodoistoques.com.br`)                                |
| `INTERNAL_API_KEY`   | Chave nova, gerada com `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `GERACAO_AUTOMATICA` | `true` (gera as mensalidades do mês sozinha)                                                            |
| `PORT`               | Normalmente a hospedagem define                                                                         |

Em produção a API se recusa a subir com a chave do `.env.example` ou com `WEB_ORIGIN` sem https; o erro diz qual variável corrigir.

### Chat do WhatsApp (opcional)

O Chat precisa de mais dois serviços, que **não** ficam expostos na internet (só na rede interna, junto da API):

1. **Servidor Evolution API** (`infra/evolution-api`): `docker compose up -d --build` com o `.env` preenchido (troque `AUTHENTICATION_API_KEY` e `POSTGRES_PASSWORD`). A imagem é a v2.3.7 oficial com a correção de LID.
2. **Microserviço** (`services/evolution`): build com `docker build -f services/evolution/Dockerfile .` a partir da raiz. Variáveis: `INTERNAL_API_KEY` (nova, 32+ caracteres), `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` (do servidor Evolution), `WEBHOOK_TOKEN` (outro valor novo) e `API_PUBLIC_URL` (endereço do microserviço visto pelo servidor Evolution, na rede interna).
3. **API**: `EVOLUTION_URL` (endereço interno do microserviço) e `EVOLUTION_CHAVE` (o `INTERNAL_API_KEY` do microserviço). `EVOLUTION_INSTANCIA` pode ficar no padrão.

Depois, o administrador conecta o número em **Chat → Conexão do número**, lendo o QR code no celular da escola. As conversas ficam no PostgreSQL do Evolution: inclua o volume `postgres_data` dele no backup.

## 3. Site

Na Vercel, importe o repositório com **Root Directory** `apps/web` (framework Next.js).

| Variável               | Valor                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| `API_URL`              | Endereço da API (ex.: `https://api.sodoistoques.com.br`)                        |
| `INTERNAL_API_KEY`     | A mesma chave da API                                                            |
| `IP_SALTOS_CONFIAVEIS` | `1` na Vercel, no Render e no Railway (quantos proxies ficam na frente do site) |

O `IP_SALTOS_CONFIAVEIS` serve para o limite de tentativas de login usar o IP real do visitante. Se a hospedagem tiver uma CDN na frente do balanceador, use `2`.

## 4. Domínio

1. Registre o domínio (ex.: `sodoistoques.com.br` no Registro.br).
2. Aponte `sistema.` para a Vercel e `api.` para a API, seguindo as instruções de domínio de cada hospedagem (registro CNAME). O certificado https é emitido sozinho.
3. Atualize `WEB_ORIGIN` na API e `API_URL` no site com os endereços finais.

## 5. Primeiro administrador

Da sua máquina, com o repositório e a URL externa do banco:

```bash
DATABASE_URL="<url externa>" INTERNAL_API_KEY="<a chave da API>" pnpm admin:criar
```

O comando pede nome, e-mail e senha (a senha não aparece na tela) e só funciona enquanto não houver nenhum administrador. Os outros usuários são criados pela tela **Usuários**.

## 6. Backup e teste de restauração

O backup diário da hospedagem é a primeira linha de defesa. Além dele, faça uma cópia própria toda semana e teste a restauração todo mês:

```bash
# Cópia (precisa do pg_dump 16 ou mais novo: pacote postgresql-client)
DATABASE_URL="<url externa>" pnpm db:backup
# -> apps/api/backups/so_dois_toques-AAAA-MM-DD-HHMM.dump e a conferência do banco

# Teste de restauração: cria um banco novo no mesmo servidor e confere
DATABASE_URL="<url externa>" pnpm db:restaurar backups/so_dois_toques-AAAA-MM-DD-HHMM.dump restauracao_teste
```

Compare a conferência das duas saídas (usuários, alunos, lançamentos, entradas, saídas, auditoria): precisam ser iguais. Depois apague o banco `restauracao_teste` pelo painel da hospedagem. A restauração nunca grava por cima de um banco com tabelas nem no banco do próprio sistema.

O arquivo de backup tem todos os dados pessoais: guarde-o criptografado, com acesso restrito, e apague cópias com mais de 30 dias (ver [LGPD](lgpd.md)).

Para voltar o sistema a partir de um backup: restaure num banco novo, confira, e troque a `DATABASE_URL` da API para ele.

## Alternativa: servidor próprio com Easypanel

Tudo no mesmo servidor, num projeto do Easypanel (ex.: `sdt`). A API fica só na rede interna: não precisa de domínio, porque o navegador nunca fala com ela.

1. **Banco:** _+ Service → Postgres_, nome `db`, imagem `postgres:16`. Copie a **Internal Connection URL** (algo como `postgres://postgres:<senha>@sdt_db:5432/sdt`). Configure o backup diário do Postgres pelo próprio Easypanel.
2. **API:** _+ Service → App_, nome `api`.
   - Source: GitHub `glinckio/so-dois-toques`, branch `main`, Build Path `/`.
   - Build: **Dockerfile**, arquivo `apps/api/Dockerfile`.
   - Environment: `DATABASE_URL` (a URL interna do passo 1), `WEB_ORIGIN` (o endereço https do site), `INTERNAL_API_KEY` (chave nova), `GERACAO_AUTOMATICA=true`.
   - Sem domínio. As migrations rodam sozinhas a cada deploy, antes de a API subir.
3. **Site:** _+ Service → App_, nome `web`.
   - Mesmo repositório e branch, Build Path `/`, Dockerfile `apps/web/Dockerfile`.
   - Environment: `API_URL=http://sdt_api:3001` (`<projeto>_<serviço>`), a mesma `INTERNAL_API_KEY`, `IP_SALTOS_CONFIAVEIS=1` (`2` se houver Cloudflare com proxy ligado na frente).
   - Domains: o domínio do site, com HTTPS, porta `3000`. No DNS, registro A apontando para o IP do servidor.
4. **Primeiro administrador:** no serviço `api`, abra o **Console** e rode `node dist/cli/criar-admin.js` (pede nome, e-mail e senha).
5. **Atualizações:** ligue o _Auto Deploy_ nos dois apps ou clique em _Deploy_. Faça backup do banco antes de publicar versão com migration.

O `pnpm db:backup` e o `pnpm db:restaurar` continuam valendo da sua máquina; para isso, exponha a porta do Postgres só enquanto precisar (ou rode-os por um túnel SSH).

## 7. Antes de abrir para a equipe

- [ ] Proteção da branch `main` ligada no GitHub (merge só com CI verde e aprovação).
- [ ] `/health` da API responde ok pelo endereço final.
- [ ] Login funcionando pelo domínio, com https.
- [ ] Primeiro administrador criado; equipe cadastrada com o perfil certo.
- [ ] Nome da quadra, planos e turmas cadastrados.
- [ ] Um backup feito e restaurado com conferência igual.
- [ ] Conferência manual das telas no celular e no computador.
- [ ] Se for usar o Chat: número conectado e um teste de enviar e receber texto, áudio, foto e figurinha.
- [ ] Tag `v1.0.0` criada no commit que foi para produção:

```bash
git tag -a v1.0.0 -m "Só Dois Toques 1.0.0" && git push origin v1.0.0
```

## Atualizações

Cada PR aprovado na `main` pode ir para produção. A Vercel publica o site sozinha a cada merge; na API, o comando de antes de subir aplica as migrations novas. Faça um `pnpm db:backup` antes de publicar uma versão com migration.

### Etapa 14 (foco em aulas)

A migration `20261015120000_foco_em_aulas` apaga as tabelas de estoque, caixa, quadras parceiras e reservas de cliente. Antes de mexer em qualquer coisa, ela confere se há dados nessas partes; se houver, para com a mensagem do que achou e o banco fica como estava. Faça o `pnpm db:backup` antes de publicar e, se ela parar, decida com o dono o que fazer com esses dados.
