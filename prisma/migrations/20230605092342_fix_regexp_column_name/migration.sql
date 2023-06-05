/*
  Warnings:

  - You are about to drop the column `regExp` on the `tags` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tags" DROP COLUMN "regExp",
ADD COLUMN     "reg_exp" VARCHAR(255);
