# Contexte de build : la racine du monorepo (nécessaire pour pnpm workspace + packages/shared).
FROM node:24-slim AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @urbanflow/shared build && pnpm --filter web build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /workspace/packages/shared ./packages/shared
COPY --from=build /workspace/apps/web ./apps/web
WORKDIR /workspace/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
