# Multi-stage build for the Next.js 16 app (standalone output).
FROM node:20-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# --- build ---
FROM base AS build
# Placeholder URL — prisma generate/next build don't connect; real URL is runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
# Schema + config first so postinstall's `prisma generate` has what it needs.
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate
RUN pnpm build

# --- runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
