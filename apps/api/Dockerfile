# API (NestJS + Prisma). Build a partir da raiz do repositório:
#   docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
# O postinstall roda o prisma generate, que só precisa de uma URL válida (não conecta).
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    pnpm install --frozen-lockfile --filter @sdt/api

COPY apps/api apps/api
RUN pnpm --filter @sdt/api build && chown -R node:node /app

USER node
WORKDIR /app/apps/api
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
# Aplica as migrations novas antes de subir a API.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
