-- CreateEnum
CREATE TYPE "FacRole" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "FacService" AS ENUM ('MAINTENANCE', 'CLEANING');

-- CreateEnum
CREATE TYPE "FacPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "FacStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FacTeamKind" AS ENUM ('INTERNAL', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "FacMapStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FacEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "FacAttachmentKind" AS ENUM ('REPORT', 'COMPLETION');

-- CreateTable
CREATE TABLE "FacUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "role" "FacRole" NOT NULL DEFAULT 'EMPLOYEE',
    "passwordHash" TEXT,
    "entraOid" TEXT,
    "teamId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacBuilding" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacWing" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacWing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacFloor" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "wingId" TEXT,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacArea" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL DEFAULT '',
    "descAr" TEXT NOT NULL DEFAULT '',
    "isOther" BOOLEAN NOT NULL DEFAULT false,
    "fields" TEXT[],
    "scopeNoteEn" TEXT NOT NULL DEFAULT '',
    "scopeNoteAr" TEXT NOT NULL DEFAULT '',
    "meta" JSONB NOT NULL DEFAULT '{}',
    "qrToken" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacCategory" (
    "id" TEXT NOT NULL,
    "service" "FacService" NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL DEFAULT '',
    "descAr" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'wrench',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacIssue" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "areaKinds" TEXT[],
    "floorCodes" TEXT[],
    "defaultPriority" "FacPriority" NOT NULL DEFAULT 'MEDIUM',
    "safetyRisk" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacTeam" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "kind" "FacTeamKind" NOT NULL DEFAULT 'INTERNAL',
    "specialty" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "scopeConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacRoutingRule" (
    "id" TEXT NOT NULL,
    "service" "FacService",
    "categoryId" TEXT,
    "floorCode" TEXT,
    "areaKind" TEXT,
    "teamId" TEXT NOT NULL,
    "autoAssign" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacRoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacSlaPolicy" (
    "id" TEXT NOT NULL,
    "priority" "FacPriority" NOT NULL,
    "responseMinutes" INTEGER,
    "resolutionMinutes" INTEGER,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacSlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Muscat',
    "workStart" TEXT NOT NULL DEFAULT '07:30',
    "workEnd" TEXT NOT NULL DEFAULT '15:30',
    "workDays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4]::INTEGER[],
    "reopenDays" INTEGER NOT NULL DEFAULT 7,
    "escalationEmails" TEXT NOT NULL DEFAULT '',
    "emergencyContactEn" TEXT NOT NULL DEFAULT '',
    "emergencyContactAr" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacHoliday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,

    CONSTRAINT "FacHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacCounter" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "FacCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "FacRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "service" "FacService" NOT NULL,
    "categoryId" TEXT,
    "issueId" TEXT,
    "issueOther" TEXT NOT NULL DEFAULT '',
    "buildingId" TEXT,
    "floorId" TEXT,
    "areaId" TEXT,
    "locationLabelEn" TEXT NOT NULL DEFAULT '',
    "locationLabelAr" TEXT NOT NULL DEFAULT '',
    "locationDetail" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT NOT NULL,
    "priority" "FacPriority" NOT NULL DEFAULT 'MEDIUM',
    "safetyFlag" BOOLEAN NOT NULL DEFAULT false,
    "status" "FacStatus" NOT NULL DEFAULT 'SUBMITTED',
    "teamId" TEXT,
    "responseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "overdueNotifiedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT NOT NULL DEFAULT '',
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "FacStatus",
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "kind" "FacAttachmentKind" NOT NULL DEFAULT 'REPORT',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacActionToken" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacEmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "subjectEn" TEXT NOT NULL,
    "subjectAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacEmailOutbox" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "FacEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "requestId" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacEmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacFloorMap" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "status" "FacMapStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacFloorMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacMapMarker" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "areaId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'POINT',
    "labelEn" TEXT NOT NULL DEFAULT '',
    "labelAr" TEXT NOT NULL DEFAULT '',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "points" JSONB,
    "color" TEXT NOT NULL DEFAULT '#2D13EA',

    CONSTRAINT "FacMapMarker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "data" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacUser_email_key" ON "FacUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FacUser_entraOid_key" ON "FacUser"("entraOid");

-- CreateIndex
CREATE INDEX "FacSession_userId_idx" ON "FacSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FacBuilding_code_key" ON "FacBuilding"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FacWing_buildingId_code_key" ON "FacWing"("buildingId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "FacFloor_buildingId_code_key" ON "FacFloor"("buildingId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "FacArea_qrToken_key" ON "FacArea"("qrToken");

-- CreateIndex
CREATE INDEX "FacArea_floorId_sortOrder_idx" ON "FacArea"("floorId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FacCategory_key_key" ON "FacCategory"("key");

-- CreateIndex
CREATE INDEX "FacCategory_service_sortOrder_idx" ON "FacCategory"("service", "sortOrder");

-- CreateIndex
CREATE INDEX "FacIssue_categoryId_sortOrder_idx" ON "FacIssue"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FacSlaPolicy_priority_key" ON "FacSlaPolicy"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "FacHoliday_date_key" ON "FacHoliday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FacRequest_reference_key" ON "FacRequest"("reference");

-- CreateIndex
CREATE INDEX "FacRequest_employeeId_createdAt_idx" ON "FacRequest"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "FacRequest_status_createdAt_idx" ON "FacRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FacRequest_teamId_status_idx" ON "FacRequest"("teamId", "status");

-- CreateIndex
CREATE INDEX "FacRequest_floorId_idx" ON "FacRequest"("floorId");

-- CreateIndex
CREATE INDEX "FacRequestEvent_requestId_createdAt_idx" ON "FacRequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "FacAttachment_requestId_idx" ON "FacAttachment"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "FacEmailTemplate_key_key" ON "FacEmailTemplate"("key");

-- CreateIndex
CREATE INDEX "FacEmailOutbox_status_nextAttemptAt_idx" ON "FacEmailOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "FacFloorMap_floorId_status_idx" ON "FacFloorMap"("floorId", "status");

-- CreateIndex
CREATE INDEX "FacAudit_entity_entityId_idx" ON "FacAudit"("entity", "entityId");

-- CreateIndex
CREATE INDEX "FacAudit_createdAt_idx" ON "FacAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "FacUser" ADD CONSTRAINT "FacUser_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "FacTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacSession" ADD CONSTRAINT "FacSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "FacUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacWing" ADD CONSTRAINT "FacWing_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "FacBuilding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacFloor" ADD CONSTRAINT "FacFloor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "FacBuilding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacFloor" ADD CONSTRAINT "FacFloor_wingId_fkey" FOREIGN KEY ("wingId") REFERENCES "FacWing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacArea" ADD CONSTRAINT "FacArea_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "FacFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacArea" ADD CONSTRAINT "FacArea_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FacArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacIssue" ADD CONSTRAINT "FacIssue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FacCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRoutingRule" ADD CONSTRAINT "FacRoutingRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FacCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRoutingRule" ADD CONSTRAINT "FacRoutingRule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "FacTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "FacUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FacCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "FacIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "FacBuilding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "FacFloor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FacArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequest" ADD CONSTRAINT "FacRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "FacTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacRequestEvent" ADD CONSTRAINT "FacRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FacRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacAttachment" ADD CONSTRAINT "FacAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FacRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacActionToken" ADD CONSTRAINT "FacActionToken_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FacRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacFloorMap" ADD CONSTRAINT "FacFloorMap_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "FacFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacMapMarker" ADD CONSTRAINT "FacMapMarker_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "FacFloorMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacMapMarker" ADD CONSTRAINT "FacMapMarker_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FacArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
