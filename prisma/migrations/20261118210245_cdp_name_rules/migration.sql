-- CreateTable
CREATE TABLE "SurveyNameRule" (
    "key" TEXT NOT NULL,
    "mergeInto" TEXT,
    "label" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyNameRule_pkey" PRIMARY KEY ("key")
);
