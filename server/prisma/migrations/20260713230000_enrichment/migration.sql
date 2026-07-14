-- AlterTable: videos 新增 SEO 元数据列（全部可空/带默认，不锁表风险低）
ALTER TABLE "videos"
  ADD COLUMN "tmdbId" INTEGER,
  ADD COLUMN "imdbId" TEXT,
  ADD COLUMN "detailedDescription" TEXT,
  ADD COLUMN "directors" TEXT,
  ADD COLUMN "writers" TEXT,
  ADD COLUMN "genresDetailed" TEXT,
  ADD COLUMN "releaseDate" TIMESTAMP(3),
  ADD COLUMN "tmdbRating" DOUBLE PRECISION,
  ADD COLUMN "tmdbVoteCount" INTEGER,
  ADD COLUMN "runtime" INTEGER,
  ADD COLUMN "keywords" TEXT,
  ADD COLUMN "posterTmdb" TEXT,
  ADD COLUMN "backdropTmdb" TEXT,
  ADD COLUMN "enrichedAt" TIMESTAMP(3),
  ADD COLUMN "enrichSource" TEXT,
  ADD COLUMN "enrichStatus" TEXT,
  ADD COLUMN "enrichRetries" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "videos_enrichStatus_idx" ON "videos"("enrichStatus");

-- CreateTable
CREATE TABLE "enrichment_log" (
    "id" SERIAL NOT NULL,
    "videoId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "matchedId" TEXT,
    "fields" TEXT,
    "error" TEXT,
    "latency" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrichment_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tmdb_cache" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tmdb_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enrichment_log_videoId_idx" ON "enrichment_log"("videoId");

-- CreateIndex
CREATE INDEX "enrichment_log_source_ok_idx" ON "enrichment_log"("source", "ok");

-- CreateIndex
CREATE UNIQUE INDEX "tmdb_cache_key_key" ON "tmdb_cache"("key");

-- CreateIndex
CREATE INDEX "tmdb_cache_expiresAt_idx" ON "tmdb_cache"("expiresAt");
