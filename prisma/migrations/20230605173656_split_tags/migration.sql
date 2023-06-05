/*
  Warnings:

  - You are about to drop the `_MovieToTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ShowtimeToTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_MovieToTag" DROP CONSTRAINT "_MovieToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_MovieToTag" DROP CONSTRAINT "_MovieToTag_B_fkey";

-- DropForeignKey
ALTER TABLE "_ShowtimeToTag" DROP CONSTRAINT "_ShowtimeToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_ShowtimeToTag" DROP CONSTRAINT "_ShowtimeToTag_B_fkey";

-- DropTable
DROP TABLE "_MovieToTag";

-- DropTable
DROP TABLE "_ShowtimeToTag";

-- DropTable
DROP TABLE "tags";

-- CreateTable
CREATE TABLE "movie_tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "reg_exp" VARCHAR(255),
    "is_filter_enabled" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "category" "TagCategory" NOT NULL,

    CONSTRAINT "movie_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showtime_tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "reg_exp" VARCHAR(255),
    "is_filter_enabled" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "category" "TagCategory" NOT NULL,

    CONSTRAINT "showtime_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MovieToMovieTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ShowtimeToShowtimeTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "movie_tags_name_key" ON "movie_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "showtime_tags_name_key" ON "showtime_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_MovieToMovieTag_AB_unique" ON "_MovieToMovieTag"("A", "B");

-- CreateIndex
CREATE INDEX "_MovieToMovieTag_B_index" ON "_MovieToMovieTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ShowtimeToShowtimeTag_AB_unique" ON "_ShowtimeToShowtimeTag"("A", "B");

-- CreateIndex
CREATE INDEX "_ShowtimeToShowtimeTag_B_index" ON "_ShowtimeToShowtimeTag"("B");

-- AddForeignKey
ALTER TABLE "_MovieToMovieTag" ADD CONSTRAINT "_MovieToMovieTag_A_fkey" FOREIGN KEY ("A") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieToMovieTag" ADD CONSTRAINT "_MovieToMovieTag_B_fkey" FOREIGN KEY ("B") REFERENCES "movie_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShowtimeToShowtimeTag" ADD CONSTRAINT "_ShowtimeToShowtimeTag_A_fkey" FOREIGN KEY ("A") REFERENCES "showtimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShowtimeToShowtimeTag" ADD CONSTRAINT "_ShowtimeToShowtimeTag_B_fkey" FOREIGN KEY ("B") REFERENCES "showtime_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
