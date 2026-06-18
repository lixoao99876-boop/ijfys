-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PUBLISHED', 'UNPUBLISHED', 'DELETED');

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "totalPlayMs" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "VideoStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "detail" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_logs" (
    "keyword" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "lastSearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("keyword")
);

-- CreateIndex
CREATE INDEX "admin_logs_action_createdAt_idx" ON "admin_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "admin_logs_createdAt_idx" ON "admin_logs"("createdAt");

-- CreateIndex
CREATE INDEX "search_logs_hits_idx" ON "search_logs"("hits");

-- CreateIndex
CREATE INDEX "search_logs_lastSearchedAt_idx" ON "search_logs"("lastSearchedAt");

-- CreateIndex
CREATE INDEX "videos_status_idx" ON "videos"("status");

-- CreateIndex
CREATE INDEX "videos_playCount_idx" ON "videos"("playCount");
