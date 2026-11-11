/*
  Warnings:

  - You are about to drop the column `hourFim` on the `subTimeEntries` table. All the data in the column will be lost.
  - You are about to drop the column `totalHours` on the `subTimeEntries` table. All the data in the column will be lost.
  - Added the required column `hourFin` to the `subTimeEntries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "subTimeEntries" DROP COLUMN "hourFim",
DROP COLUMN "totalHours",
ADD COLUMN     "hourFin" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "totalHour" TEXT;
