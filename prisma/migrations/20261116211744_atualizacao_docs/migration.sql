/*
  Warnings:

  - You are about to alter the column `totalTime` on the `timeentries` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - A unique constraint covering the columns `[email]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId,title]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,projectId,date]` on the table `timeentries` will be added. If there are existing duplicate values, this will fail.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "timeentries" ALTER COLUMN "totalTime" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_clientId_title_key" ON "projects"("clientId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "timeentries_userId_projectId_date_key" ON "timeentries"("userId", "projectId", "date");
