-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Device3DModel" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ModelStatus" NOT NULL DEFAULT 'DRAFT',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "triangleCount" INTEGER NOT NULL,
    "nodeNames" TEXT[],
    "parts" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device3DModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Device3DModel_deviceId_status_idx" ON "Device3DModel"("deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Device3DModel_deviceId_version_key" ON "Device3DModel"("deviceId", "version");

-- AddForeignKey
ALTER TABLE "Device3DModel" ADD CONSTRAINT "Device3DModel_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
