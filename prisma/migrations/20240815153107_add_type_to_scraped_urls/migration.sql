/*
  Warnings:

  - Added the required column `type` to the `scraped_urls` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScrapedUrlType" AS ENUM ('SHOWTIMES', 'TICKETING');

-- AlterTable
ALTER TABLE "scraped_urls" ADD COLUMN     "type" "ScrapedUrlType" NOT NULL;
