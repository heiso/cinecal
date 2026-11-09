# Cinecal &middot; ![logo](./public/favicon-32x32.png)

React Router 8 (framework mode) + Prisma 8 (`@prisma/orm-postgres`) on PostgreSQL, Node 26.

## Install and first run

```bash
npm i
cp .env.tpl .env
npm run up
npm run reset-database
npm run dev
```

Then go to http://localhost:3000

Coming from the pm2 and Postgres 12 setup? Stop the old pm2 apps, drop the old database volume
(Postgres 18 uses a new one), then recreate the database.

```bash
pm2 delete prisma icons server
docker compose down
docker volume rm cinecal_pgdata
npm run up
npm run reset-database
```

## DevEnv actions

Start Postgres (docker compose), then the dev server. The dev server also re-emits the Prisma
contract when `prisma/contract.prisma` changes and rebuilds the icon sprite when `svgs/` changes.

```bash
npm run up
npm run dev
```

Stop Postgres

```bash
npm run down
```

Recreate the database, apply the migrations and the seeds

```bash
npm run reset-database
```

Run Lint (typecheck, oxlint, oxfmt)

```bash
npm run lint
```

Run tests

```bash
npm run test
```

The scraper test needs an empty, migrated database, which it truncates:

```bash
createdb -h 127.0.0.1 -U postgres cinecal_test
npx prisma db migrate --db postgresql://postgres@127.0.0.1:5432/cinecal_test
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/cinecal_test npm run test
```

Run a scraper step (`scrapShowtimes <days>`, `scrapPosters`, `savePosterBlurHashes`, `scrapTicketing`)

```bash
npm run scraper -- scrapShowtimes 7
```

## Database

Prisma 8's standard layout: the data contract is `src/prisma/contract.prisma`, next to the generated
`contract.json` and `contract.d.ts` (commit them) and `db.ts`, the client scripts import. The app has its
own client in `app/db.server.ts`. Migrations live in `migrations/`.

After changing the contract (the dev server re-emits it on save, `npm run db:emit` does it otherwise):

```bash
npm run db:plan -- my_change    # write the migration in migrations/app (commit it)
npm run db:migrate              # apply it
```

A new database is created by the migrations, then gets its theaters (and tags) from the seed script:

```bash
npm run db:migrate
npm run db:seed
```

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: lint and tests, then the Docker image is built,
the pending migrations are applied to the production database (through `flyctl proxy`), and the image is released.
A migration runs while the previous version still serves traffic, so it must stay compatible with it
(add a column first, drop it in a later release).

## Dates

Showtimes are Paris events: days, weeks and showtime hours are computed in the process time zone,
so every process runs with `TZ=Europe/Paris`: `fly.toml`, the scrape workflow, `vitest.config.ts` and `.env`.
