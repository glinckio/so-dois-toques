# Site (Next.js). Build a partir da raiz do repositório:
#   docker build -f apps/web/Dockerfile .
FROM node:22-bookworm-slim
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @sdt/web

COPY apps/web apps/web
# Um teste do web confere regras com as da API; o typecheck do build precisa delas.
COPY apps/api/src/acesso/regras.ts apps/api/src/acesso/
COPY apps/api/src/estoque/regras.ts apps/api/src/estoque/
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @sdt/web build && chown -R node:node /app

USER node
WORKDIR /app/apps/web
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "exec node_modules/.bin/next start -H 0.0.0.0 -p $PORT"]
