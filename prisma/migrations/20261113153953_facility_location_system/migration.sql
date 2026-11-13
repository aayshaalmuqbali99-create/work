-- Omantel Facility Hub: complete building location system.
-- Safe for existing data: floor→wing assignments are copied into FacFloorWing before the old
-- column is dropped, and every area type already in use is added to the new area-category
-- library before areas are linked to it. No request rows are modified.
-- CreateEnum
CREATE TYPE "FacVerification" AS ENUM ('CONFIRMED', 'PROVISIONAL');

-- CreateTable
CREATE TABLE "FacFloorWing" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "wingId" TEXT NOT NULL,
    "verification" "FacVerification" NOT NULL DEFAULT 'CONFIRMED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacFloorWing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacFloorWing_floorId_wingId_key" ON "FacFloorWing"("floorId", "wingId");

-- Preserve existing floor→wing assignments
INSERT INTO "FacFloorWing" ("id", "floorId", "wingId")
SELECT 'fw_' || md5("id" || "wingId"), "id", "wingId" FROM "FacFloor" WHERE "wingId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "FacFloor" DROP CONSTRAINT "FacFloor_wingId_fkey";

-- AlterTable
ALTER TABLE "FacArea" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "verification" "FacVerification" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "wingId" TEXT;

-- AlterTable
ALTER TABLE "FacFloor" DROP COLUMN "wingId",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "verification" "FacVerification" NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "FacFloorMap" ADD COLUMN     "wingId" TEXT;

-- AlterTable
ALTER TABLE "FacMapMarker" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "FacRequest" ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "wingId" TEXT;

-- AlterTable
ALTER TABLE "FacSettings" ADD COLUMN     "seedVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FacWing" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "verification" "FacVerification" NOT NULL DEFAULT 'CONFIRMED';

-- CreateTable
CREATE TABLE "FacAreaCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'map-pin',
    "defaultFields" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "FacAreaCategory_pkey" PRIMARY KEY ("id")
);

-- Every area type already used by an area joins the library (names are completed by the seed)
INSERT INTO "FacAreaCategory" ("id", "key", "nameEn", "nameAr", "defaultFields")
SELECT 'ac_' || md5("kind"), "kind", "kind", "kind", ARRAY[]::TEXT[] FROM (SELECT DISTINCT "kind" FROM "FacArea") k;

-- CreateTable
CREATE TABLE "FacLocation" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "wingId" TEXT,
    "areaId" TEXT,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "nameEn" TEXT NOT NULL DEFAULT '',
    "nameAr" TEXT NOT NULL DEFAULT '',
    "verification" "FacVerification" NOT NULL DEFAULT 'CONFIRMED',
    "qrToken" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "FacLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacAreaCategory_key_key" ON "FacAreaCategory"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FacLocation_qrToken_key" ON "FacLocation"("qrToken");

-- CreateIndex
CREATE INDEX "FacLocation_floorId_kind_idx" ON "FacLocation"("floorId", "kind");

-- CreateIndex
CREATE INDEX "FacLocation_areaId_idx" ON "FacLocation"("areaId");

-- CreateIndex
CREATE INDEX "FacRequest_wingId_idx" ON "FacRequest"("wingId");

-- CreateIndex
CREATE INDEX "FacRequest_areaId_idx" ON "FacRequest"("areaId");

-- AddForeignKey
ALTER TABLE "FacFloorWing" ADD CONSTRAINT "FacFloorWing_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "FacFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacFloorWing" ADD CONSTRAINT "FacFloorWing_wingId_fkey" FOREIGN KEY ("wingId") REFERENCES "FacWing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacArea" ADD CONSTRAINT "FacArea_kind_fkey" FOREIGN KEY ("kind") REFERENCES "FacAreaCategory"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacArea" ADD CONSTRAINT "FacArea_wingId_fkey" FOREIGN KEY ("wingId") REFERENCES "FacWing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacLocation" ADD CONSTRAINT "FacLocation_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "FacFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacLocation" ADD CONSTRAINT "FacLocation_wingId_fkey" FOREIGN KEY ("wingId") REFERENCES "FacWing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacLocation" ADD CONSTRAINT "FacLocation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FacArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_wingId_fkey" FOREIGN KEY ("wingId") REFERENCES "FacWing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "FacLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacFloorMap" ADD CONSTRAINT "FacFloorMap_wingId_fkey" FOREIGN KEY ("wingId") REFERENCES "FacWing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacMapMarker" ADD CONSTRAINT "FacMapMarker_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "FacLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
