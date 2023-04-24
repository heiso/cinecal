-- DropForeignKey
ALTER TABLE "showtimes" DROP CONSTRAINT "showtimes_movie_id_fkey";

-- DropForeignKey
ALTER TABLE "showtimes" DROP CONSTRAINT "showtimes_theater_id_fkey";

-- CreateTable
CREATE TABLE "prices" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "showtimeId" INTEGER,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_showtimeId_fkey" FOREIGN KEY ("showtimeId") REFERENCES "showtimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_theater_id_fkey" FOREIGN KEY ("theater_id") REFERENCES "theaters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
