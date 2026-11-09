# Cinecal &middot; ![logo](./public/favicon-32x32.png)

React Router 8 (framework mode) + Prisma 8 (`@prisma/orm-postgres`) on PostgreSQL, Node 26.

## Install and first run

```bash
npm i
cp .env.tpl .env
npm run up
npm run reset-database
npm run log
```

Then go to http://localhost:3000

## DevEnv actions

Start (Postgres in docker, dev server, contract and icons watchers in pm2)

```bash
npm run up
```

Show logs

```bash
npm run log
```

Stop

```bash
npm run down
```

Restart

```bash
npm run restart
```

Recreate the database, apply the migrations and the seeds

```bash
npm run reset-database
```

Run Lint (typecheck, oxlint, prettier)

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
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/cinecal_test npm run db:migrate
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/cinecal_test npm run test
```

Run a scraper step (`scrapShowtimes <days>`, `scrapPosters`, `savePosterBlurHashes`, `scrapTicketing`)

```bash
npm run scraper -- scrapShowtimes 7
```

## Database

The data contract is `prisma/contract.prisma`. After changing it:

```bash
npm run db:emit                 # regenerate prisma/contract.json and contract.d.ts (commit them)
npm run db:plan -- my_change    # write the migration in prisma/migrations (commit it)
npm run db:migrate              # apply it
```

Production applies pending migrations with `prisma db migrate` when the container starts.
