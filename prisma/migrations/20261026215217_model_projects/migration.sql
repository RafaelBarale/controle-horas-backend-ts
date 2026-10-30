-- CreateEnum
CREATE TYPE "StatusProject" AS ENUM ('EM_EXECUCAO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "TypeProject" AS ENUM ('ABERTO', 'FECHADO');

-- CreateTable
CREATE TABLE "projects" (
    "projectId" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "type" "TypeProject" NOT NULL DEFAULT 'ABERTO',
    "status" "StatusProject" NOT NULL DEFAULT 'EM_EXECUCAO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" INTEGER NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("projectId")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;
