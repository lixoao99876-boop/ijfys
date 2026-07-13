-- CreateEnum
CREATE TYPE "CoverStatus" AS ENUM ('UNKNOWN', 'VALID', 'INVALID');

-- AlterTable
ALTER TABLE "videos" 
  ADD COLUMN "coverStatus" "CoverStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "coverCheckedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "videos_coverStatus_idx" ON "videos"("coverStatus");
