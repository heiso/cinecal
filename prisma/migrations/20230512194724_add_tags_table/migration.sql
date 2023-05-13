/*
  Warnings:

  - You are about to drop the column `tags` on the `movies` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `showtimes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "movies" DROP COLUMN "tags";

-- AlterTable
ALTER TABLE "showtimes" DROP COLUMN "tags";

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "regExp" VARCHAR(255) NOT NULL,
    "is_filter_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MovieToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ShowtimeToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_MovieToTag_AB_unique" ON "_MovieToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_MovieToTag_B_index" ON "_MovieToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ShowtimeToTag_AB_unique" ON "_ShowtimeToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_ShowtimeToTag_B_index" ON "_ShowtimeToTag"("B");

-- AddForeignKey
ALTER TABLE "_MovieToTag" ADD CONSTRAINT "_MovieToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieToTag" ADD CONSTRAINT "_MovieToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShowtimeToTag" ADD CONSTRAINT "_ShowtimeToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "showtimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShowtimeToTag" ADD CONSTRAINT "_ShowtimeToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
