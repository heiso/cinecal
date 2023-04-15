# ===
# base node image
# ===
FROM node:19-bullseye-slim as base

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl cron curl

# Install all node_modules, including dev dependencies
FROM base as deps

RUN mkdir /app
WORKDIR /app

ADD package.json package-lock.json ./
RUN npm install --production=false



# ===
# Setup production node_modules
# ===
FROM base as production-deps

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json package-lock.json ./
RUN npm prune --production



# ===
# Build the app
# ===
FROM base as build

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

ADD prisma .
RUN npx prisma generate

ADD . .
RUN npm run build



# ===
# Finally, build the production image with minimal footprint
# ===
FROM base

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/dist /app/dist
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
ADD . .

CMD npx prisma migrate deploy && \
  printenv | awk -F= '{ print $1"="$2 }' > /tmp/crontab && \
  cat ./crontab >> /tmp/crontab && \
  crontab -u root /tmp/crontab && \
  cron && \
  node ./dist/src/index.js