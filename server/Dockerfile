# Node API — production image (Phase 9 compose)
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

COPY . .
RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=8001
ENV HOST=0.0.0.0

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8001

ENTRYPOINT ["/docker-entrypoint.sh"]
