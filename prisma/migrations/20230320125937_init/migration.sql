-- CreateEnum
CREATE TYPE "Language" AS ENUM ('VO', 'VF');

-- CreateTable
CREATE TABLE "scraped_urls" (
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "scraped_urls_pkey" PRIMARY KEY ("url")
);

-- CreateTable
CREATE TABLE "movies" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "allocine_id" INTEGER NOT NULL,
    "themoviedb_id" INTEGER,
    "release_date" TIMESTAMP(3),
    "title" VARCHAR(255) NOT NULL,
    "original_title" VARCHAR(255) NOT NULL,
    "synopsis" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "poster_url" TEXT,
    "director" TEXT,
    "tags" TEXT[],

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showtimes" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "allocine_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "is_preview" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "language" "Language" NOT NULL,
    "ticketingUrl" TEXT,
    "theater_id" INTEGER NOT NULL,
    "movie_id" INTEGER NOT NULL,

    CONSTRAINT "showtimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theaters" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "allocine_id" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "website" VARCHAR(255) NOT NULL,

    CONSTRAINT "theaters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "movies_allocine_id_key" ON "movies"("allocine_id");

-- CreateIndex
CREATE UNIQUE INDEX "showtimes_allocine_id_key" ON "showtimes"("allocine_id");

-- CreateIndex
CREATE UNIQUE INDEX "theaters_allocine_id_key" ON "theaters"("allocine_id");

-- AddForeignKey
ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_theater_id_fkey" FOREIGN KEY ("theater_id") REFERENCES "theaters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
