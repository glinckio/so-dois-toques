# Microserviço do WhatsApp. Build a partir da raiz do repositório:
#   docker build -f services/evolution/Dockerfile -t sdt-evolution .
FROM node:22-bookworm-slim AS builder
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/evolution/package.json services/evolution/
RUN pnpm install --frozen-lockfile --filter @sdt/evolution...
COPY services/evolution services/evolution
RUN pnpm --filter @sdt/evolution build && pnpm --filter @sdt/evolution deploy --prod --legacy /app

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
USER node
EXPOSE 3004
CMD ["node", "dist/main.js"]
