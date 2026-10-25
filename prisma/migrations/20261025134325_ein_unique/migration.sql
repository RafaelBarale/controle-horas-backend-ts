/*
  Warnings:

  - A unique constraint covering the columns `[ein]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `clients` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ein` on table `clients` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "ein" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_ein_key" ON "clients"("ein");
