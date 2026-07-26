# Build context: repo root (pnpm workspace needs the root lockfile/manifests)
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
# Manifests first so the pnpm install layer caches across source-only commits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/crawler/package.json apps/crawler/
RUN pnpm install --filter @hiphouse/web... --frozen-lockfile
COPY . .
# VITE_* must be present at build time (baked into the client bundle).
ARG VITE_KAKAO_REST_API_KEY
ENV VITE_KAKAO_REST_API_KEY=$VITE_KAKAO_REST_API_KEY
RUN pnpm --filter @hiphouse/web build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
