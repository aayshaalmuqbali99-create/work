-- CreateTable
CREATE TABLE "SurveySetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveySetting_pkey" PRIMARY KEY ("key")
);
