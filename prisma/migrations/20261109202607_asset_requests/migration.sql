-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('DONATION', 'PURCHASE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "AssetRequest" (
    "id" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "items" JSONB NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetRequest_status_createdAt_idx" ON "AssetRequest"("status", "createdAt");
