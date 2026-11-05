/*
  Warnings:

  - The primary key for the `timeentries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `timeEntriesId` on the `timeentries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "timeentries" DROP CONSTRAINT "timeentries_pkey",
DROP COLUMN "timeEntriesId",
ADD COLUMN     "timeEntrieId" SERIAL NOT NULL,
ADD CONSTRAINT "timeentries_pkey" PRIMARY KEY ("timeEntrieId");
