# Build from the repository root so the admin app can consume core and packages/editor:
# docker build -f admin/Dockerfile -t ruxt-admin .
FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
ENV NODE_ENV=production
RUN pnpm --dir admin build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /workspace/admin/.output ./
RUN mkdir -p /data/cv /data/cv-pipeline /data/analytics && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O - "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
CMD ["node", "server/index.mjs"]
