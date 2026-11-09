# syntax=docker/dockerfile:1
# Migrations are not part of the image: the deploy workflow applies them before `fly deploy`
ARG NODE_VERSION=26.13.0

FROM node:${NODE_VERSION}-slim AS base
LABEL fly_launch_runtime="React Router"
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

# Runtime: the build output and the production dependencies
FROM base
COPY --link package.json ./
COPY --link --from=production-dependencies /app/node_modules ./node_modules
COPY --link --from=build /app/build ./build
USER node
EXPOSE 8080
CMD ["node", "--max-old-space-size=256", "node_modules/@react-router/serve/bin.cjs", "./build/server/index.js"]
