-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('DRAFT', 'DEPLOYING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "description" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseAsset" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(120) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Release_createdAt_idx" ON "Release"("createdAt");

-- CreateIndex
CREATE INDEX "Release_status_createdAt_idx" ON "Release"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseAsset_objectKey_key" ON "ReleaseAsset"("objectKey");

-- CreateIndex
CREATE INDEX "ReleaseAsset_releaseId_createdAt_idx" ON "ReleaseAsset"("releaseId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReleaseAsset" ADD CONSTRAINT "ReleaseAsset_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
