# Microserviço do WhatsApp (NestJS). Build a partir da raiz do repositório:
#   docker build -f services/evolution/Dockerfile .
FROM node:22-bookworm-slim
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/evolution/package.json services/evolution/
RUN pnpm install --frozen-lockfile --filter @sdt/evolution

COPY services/evolution services/evolution
RUN pnpm --filter @sdt/evolution build && chown -R node:node /app

USER node
WORKDIR /app/services/evolution
ENV NODE_ENV=production PORT=3004
EXPOSE 3004
CMD ["node", "dist/main.js"]
