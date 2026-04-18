FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── 1. Install dependencies ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc preinstall.mjs ./
COPY lib/ lib/
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/ofppt-manager/package.json artifacts/ofppt-manager/
COPY scripts/package.json scripts/
RUN pnpm install --no-frozen-lockfile

# ── 2. Build everything ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/*/node_modules ./tmpnm/ 
COPY . .
# Re-copy node_modules from deps for all workspaces
RUN cp -r /app/node_modules ./node_modules 2>/dev/null || true
# Build libs
RUN pnpm --filter @workspace/db run build 2>/dev/null || true
RUN pnpm --filter @workspace/api-zod run build 2>/dev/null || true
RUN pnpm --filter @workspace/api-client-react run build 2>/dev/null || true
# Build API
RUN pnpm --filter @workspace/api-server run build
# Build Frontend
RUN pnpm --filter @workspace/ofppt-manager run build

# ── 3. Lean production image ──
FROM node:20-slim AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/ofppt-manager/dist/public ./artifacts/ofppt-manager/dist/public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/

ENV NODE_ENV=production
ENV PORT=8082
EXPOSE 8082

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
