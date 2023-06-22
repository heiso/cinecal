/*
  Warnings:

  - The values [SHOWTIME_CONTEXT] on the enum `TagCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `category` on the `showtime_tags` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE "showtime_tags" DROP COLUMN "category";

-- AlterEnum
BEGIN;
CREATE TYPE "TagCategory_new" AS ENUM ('GENRE', 'SUB_GENRE', 'CHARACTERISTIC', 'AWARD');
ALTER TABLE "movie_tags" ALTER COLUMN "category" TYPE "TagCategory_new" USING ("category"::text::"TagCategory_new");
ALTER TYPE "TagCategory" RENAME TO "TagCategory_old";
ALTER TYPE "TagCategory_new" RENAME TO "TagCategory";
DROP TYPE "TagCategory_old";
COMMIT;
