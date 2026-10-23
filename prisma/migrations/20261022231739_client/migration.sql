-- CreateEnum
CREATE TYPE "StatusClient" AS ENUM ('ATIVO', 'INATIVO');

-- CreateTable
CREATE TABLE "clients" (
    "clientId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "ein" TEXT,
    "status" "StatusClient" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("clientId")
);
