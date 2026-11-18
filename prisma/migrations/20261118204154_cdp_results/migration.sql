-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('PENDING', 'ACTIVE', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cdpRaw" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SurveyDataset" (
    "id" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "report" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "uploadedById" TEXT,
    "uploadedBy" TEXT NOT NULL DEFAULT '',
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyThemeTag" (
    "key" TEXT NOT NULL,
    "themes" TEXT[],
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyThemeTag_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "SurveyDataset_status_createdAt_idx" ON "SurveyDataset"("status", "createdAt");
