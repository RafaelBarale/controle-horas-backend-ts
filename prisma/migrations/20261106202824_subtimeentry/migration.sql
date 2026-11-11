/*
  Warnings:

  - The primary key for the `subTimeEntries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `subTimeEntryid` on the `subTimeEntries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "subTimeEntries" DROP CONSTRAINT "subTimeEntries_pkey",
DROP COLUMN "subTimeEntryid",
ADD COLUMN     "subTimeEntryId" SERIAL NOT NULL,
ADD CONSTRAINT "subTimeEntries_pkey" PRIMARY KEY ("subTimeEntryId");
