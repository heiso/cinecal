# syntax=docker/dockerfile:1
# One image, published by .github/workflows/ci.yml, for every service of deploy/compose.yml:
# the app (default command), the migrations and seed, and the scraper.
ARG NODE_VERSION=26.13.0

FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Build the app with every dependency, on the machine's own platform: the output is plain
# JavaScript, the same for amd64 and arm64
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-slim AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --link package.json package-lock.json ./
RUN npm ci --include=dev
COPY --link . .
RUN npm run build

# Production dependencies only, for the target platform (they include the Prisma CLI, for the migrations)
FROM base AS production-dependencies
COPY --link package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base
# The git commit, so open tabs reload after an update (see app/root.tsx)
ARG BUILD_VERSION=unknown
ENV BUILD_VERSION=${BUILD_VERSION}
COPY --link package.json prisma.config.ts ./
COPY --link --from=production-dependencies /app/node_modules ./node_modules
COPY --link --from=build /app/build ./build
# Migrations, seed and scraper run from the sources (Node runs TypeScript)
COPY --link migrations ./migrations
COPY --link src ./src
COPY --link cli ./cli
USER node
EXPOSE 3000
CMD ["node", "--max-old-space-size=256", "node_modules/@react-router/serve/bin.cjs", "./build/server/index.js"]
