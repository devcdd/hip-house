# Build context: repo root (pnpm workspace). Run as a one-shot job, not a service.
FROM node:24-alpine
RUN corepack enable
WORKDIR /app
# Manifests first: the install layer then survives source-only commits, so a
# deploy re-pulls just the small source layer instead of node_modules.
# (frozen-lockfile validates every workspace importer, so all manifests ship.)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/crawler/package.json apps/crawler/
COPY apps/web/package.json apps/web/
RUN pnpm install --filter @hiphouse/crawler... --frozen-lockfile --prod
COPY . .
WORKDIR /app/apps/crawler
# Env injected by the container runtime; artists.txt ships in the image.
ENTRYPOINT ["node", "src/index.js"]
