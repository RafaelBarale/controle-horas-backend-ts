/*
  Warnings:

  - You are about to drop the column `uttpdatedA` on the `subTimeEntries` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `subTimeEntries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "subTimeEntries" DROP CONSTRAINT "subTimeEntries_timeEntrieId_fkey";

-- AlterTable
ALTER TABLE "subTimeEntries" DROP COLUMN "uttpdatedA",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "subTimeEntries" ADD CONSTRAINT "subTimeEntries_timeEntrieId_fkey" FOREIGN KEY ("timeEntrieId") REFERENCES "timeentries"("timeEntrieId") ON DELETE CASCADE ON UPDATE CASCADE;
