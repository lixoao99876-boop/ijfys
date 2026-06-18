-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('movie', 'tv', 'anime', 'variety', 'short', 'unknown');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('FULL', 'INCREMENTAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "providers" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "weight" INTEGER NOT NULL DEFAULT 100,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "category" "Category" NOT NULL DEFAULT 'unknown',
    "year" INTEGER,
    "region" TEXT,
    "cover" TEXT,
    "backdrop" TEXT,
    "description" TEXT,
    "director" TEXT,
    "actors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "providerVodId" TEXT NOT NULL,
    "playFromCode" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "lineName" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "totalEpisodes" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSucceededAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_episodes" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "m3u8Url" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "itemsSeen" INTEGER NOT NULL DEFAULT 0,
    "videosAdded" INTEGER NOT NULL DEFAULT 0,
    "videosUpdated" INTEGER NOT NULL DEFAULT 0,
    "sourcesAdded" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "videos_externalKey_key" ON "videos"("externalKey");

-- CreateIndex
CREATE INDEX "videos_category_idx" ON "videos"("category");

-- CreateIndex
CREATE INDEX "videos_year_idx" ON "videos"("year");

-- CreateIndex
CREATE INDEX "videos_sourceUpdatedAt_idx" ON "videos"("sourceUpdatedAt");

-- CreateIndex
CREATE INDEX "episodes_videoId_idx" ON "episodes"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_videoId_index_key" ON "episodes"("videoId", "index");

-- CreateIndex
CREATE INDEX "sources_videoId_idx" ON "sources"("videoId");

-- CreateIndex
CREATE INDEX "sources_providerId_idx" ON "sources"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "sources_videoId_providerId_playFromCode_key" ON "sources"("videoId", "providerId", "playFromCode");

-- CreateIndex
CREATE INDEX "source_episodes_sourceId_idx" ON "source_episodes"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "source_episodes_sourceId_episodeId_key" ON "source_episodes"("sourceId", "episodeId");

-- CreateIndex
CREATE INDEX "sync_logs_providerId_startedAt_idx" ON "sync_logs"("providerId", "startedAt");

-- CreateIndex
CREATE INDEX "sync_logs_status_idx" ON "sync_logs"("status");

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_episodes" ADD CONSTRAINT "source_episodes_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_episodes" ADD CONSTRAINT "source_episodes_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
