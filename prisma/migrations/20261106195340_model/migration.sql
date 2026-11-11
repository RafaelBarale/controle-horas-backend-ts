-- CreateTable
CREATE TABLE "subTimeEntries" (
    "id" SERIAL NOT NULL,
    "hourIni" TIMESTAMP(3) NOT NULL,
    "hourFim" TIMESTAMP(3) NOT NULL,
    "totalHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uttpdatedA" TIMESTAMP(3) NOT NULL,
    "timeEntrieId" INTEGER NOT NULL,

    CONSTRAINT "subTimeEntries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "subTimeEntries" ADD CONSTRAINT "subTimeEntries_timeEntrieId_fkey" FOREIGN KEY ("timeEntrieId") REFERENCES "timeentries"("timeEntrieId") ON DELETE RESTRICT ON UPDATE CASCADE;
