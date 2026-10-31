-- CreateTable
CREATE TABLE "timeentries" (
    "timeEntriesId" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalTime" DOUBLE PRECISION,
    "description" TEXT[],
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "timeentries_pkey" PRIMARY KEY ("timeEntriesId")
);

-- AddForeignKey
ALTER TABLE "timeentries" ADD CONSTRAINT "timeentries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeentries" ADD CONSTRAINT "timeentries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
