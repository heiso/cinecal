/*
  Warnings:

  - Added the required column `category` to the `tags` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('GENRE', 'SUB_GENRE', 'CHARACTERISTIC', 'AWARD', 'SHOWTIME_CONTEXT');

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "category" "TagCategory" NOT NULL;
