/*
  Warnings:

  - A unique constraint covering the columns `[date,movie_id,theater_id]` on the table `showtimes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "showtimes_date_movie_id_theater_id_key" ON "showtimes"("date", "movie_id", "theater_id");
