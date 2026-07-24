# Build context: repo root (pnpm workspace). Run as a one-shot job, not a service.
FROM node:24-alpine
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --filter @hiphouse/crawler... --frozen-lockfile --prod
WORKDIR /app/apps/crawler
# Env injected by the container runtime; artists.txt ships in the image.
ENTRYPOINT ["node", "src/index.js"]
