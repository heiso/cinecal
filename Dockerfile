# syntax=docker/dockerfile:1
ARG NODE_VERSION=26.13.0



# ===
# base node image
# ===
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="React Router/Prisma"

WORKDIR /app

ENV NODE_ENV=production



# ===
# Build the app
# ===
FROM base AS build

# Install node modules
COPY --link package.json package-lock.json ./
RUN npm ci --include=dev

# Copy application code
COPY --link . .

# Build application (also generates the SVG icons sprite)
RUN npm run build

# Remove development dependencies (prisma stays: it applies the migrations at start)
RUN npm prune --omit=dev



# ===
# Final stage for app image
# ===
FROM base

# Copy built application
COPY --from=build /app /app

CMD ["sh", "-c", "node_modules/.bin/prisma db migrate && exec node --max-old-space-size=256 node_modules/@react-router/serve/bin.cjs ./build/server/index.js"]
