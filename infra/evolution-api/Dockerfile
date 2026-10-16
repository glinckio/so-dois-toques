# Servidor Evolution API v2.3.7 oficial + correção de LID (PR #2450, ainda aberto no projeto original).
# Baixa a tag oficial, aplica lid-fix.patch e segue o Dockerfile do próprio Evolution.
FROM node:24-alpine AS builder

ARG EVOLUTION_TAG=2.3.7

RUN apk update && apk add --no-cache git ffmpeg wget curl bash openssl dos2unix

WORKDIR /evolution
RUN git clone --depth 1 --branch "${EVOLUTION_TAG}" https://github.com/EvolutionAPI/evolution-api.git .

COPY lid-fix.patch /tmp/lid-fix.patch
RUN git apply --whitespace=nowarn /tmp/lid-fix.patch

RUN npm ci --silent
RUN cp .env.example .env
RUN chmod +x ./Docker/scripts/* && dos2unix ./Docker/scripts/*
RUN ./Docker/scripts/generate_database.sh
RUN npm run build

FROM node:24-alpine AS final

RUN apk update && apk add --no-cache tzdata ffmpeg bash openssl

ENV TZ=America/Sao_Paulo
ENV DOCKER_ENV=true

WORKDIR /evolution

COPY --from=builder /evolution/package.json ./package.json
COPY --from=builder /evolution/package-lock.json ./package-lock.json
COPY --from=builder /evolution/node_modules ./node_modules
COPY --from=builder /evolution/dist ./dist
COPY --from=builder /evolution/prisma ./prisma
COPY --from=builder /evolution/manager ./manager
COPY --from=builder /evolution/public ./public
COPY --from=builder /evolution/.env ./.env
COPY --from=builder /evolution/Docker ./Docker
COPY --from=builder /evolution/runWithProvider.js ./runWithProvider.js
COPY --from=builder /evolution/tsup.config.ts ./tsup.config.ts

EXPOSE 8080

ENTRYPOINT ["/bin/bash", "-c", ". ./Docker/scripts/deploy_database.sh && npm run start:prod"]
