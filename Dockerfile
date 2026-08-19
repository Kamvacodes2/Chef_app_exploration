FROM node:22-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat tzdata
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM base AS build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=2048
ENV UV_THREADPOOL_SIZE=2
ARG NEXT_PUBLIC_CHEFMATE_API_URL=https://api.chefmate.co.za
ARG NEXT_PUBLIC_MEALS_API_URL=https://api.chefmate.co.za
ARG NEXT_PUBLIC_MEALS_DATA_SOURCE=http
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_CHEFMATE_API_URL=$NEXT_PUBLIC_CHEFMATE_API_URL
ENV NEXT_PUBLIC_MEALS_API_URL=$NEXT_PUBLIC_MEALS_API_URL
ENV NEXT_PUBLIC_MEALS_DATA_SOURCE=$NEXT_PUBLIC_MEALS_DATA_SOURCE
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY . .
RUN node apps/web/scripts/generate-image-variants.mjs
RUN pnpm --filter @chefmate/web build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
