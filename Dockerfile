# syntax=docker/dockerfile:1
# Two images, published by .github/workflows/ci.yml:
# - app (default target): the build output and the production dependencies
# - jobs: migrations, seed and the scraper, which need the Prisma CLI and the sources
ARG NODE_VERSION=26.13.0

FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Build the app with every dependency
FROM base AS build
COPY --link package.json package-lock.json ./
RUN npm ci --include=dev
COPY --link . .
RUN npm run build

# Production dependencies only
FROM base AS production-dependencies
COPY --link package.json package-lock.json ./
RUN npm ci --omit=dev

FROM build AS jobs
USER node

FROM base AS app
# The git commit, so open tabs reload after an update (see app/root.tsx)
ARG BUILD_VERSION=unknown
ENV BUILD_VERSION=${BUILD_VERSION}
COPY --link package.json ./
COPY --link --from=production-dependencies /app/node_modules ./node_modules
COPY --link --from=build /app/build ./build
USER node
EXPOSE 3000
CMD ["node", "--max-old-space-size=256", "node_modules/@react-router/serve/bin.cjs", "./build/server/index.js"]
