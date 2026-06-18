-- CreateEnum
CREATE TYPE "SyncEntity" AS ENUM ('VIDEO', 'ACTOR', 'ARTICLE');

-- AlterTable
ALTER TABLE "sync_logs" ADD COLUMN     "actorsAdded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "actorsUpdated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "articlesAdded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "articlesUpdated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "entity" "SyncEntity" NOT NULL DEFAULT 'VIDEO';

-- CreateTable
CREATE TABLE "actors" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "sex" TEXT,
    "area" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "birthday" TEXT,
    "birthplace" TEXT,
    "bloodType" TEXT,
    "starSign" TEXT,
    "school" TEXT,
    "works" TEXT,
    "cover" TEXT,
    "blurb" TEXT,
    "remarks" TEXT,
    "providerCode" TEXT,
    "providerActorId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "providerArtId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "typeName" TEXT,
    "author" TEXT,
    "fromSite" TEXT,
    "cover" TEXT,
    "picSlide" TEXT,
    "blurb" TEXT,
    "content" TEXT,
    "jumpUrl" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "upVotes" INTEGER NOT NULL DEFAULT 0,
    "downVotes" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actors_externalKey_key" ON "actors"("externalKey");

-- CreateIndex
CREATE INDEX "actors_name_idx" ON "actors"("name");

-- CreateIndex
CREATE INDEX "actors_sourceUpdatedAt_idx" ON "actors"("sourceUpdatedAt");

-- CreateIndex
CREATE INDEX "articles_sourceUpdatedAt_idx" ON "articles"("sourceUpdatedAt");

-- CreateIndex
CREATE INDEX "articles_typeName_idx" ON "articles"("typeName");

-- CreateIndex
CREATE UNIQUE INDEX "articles_providerCode_providerArtId_key" ON "articles"("providerCode", "providerArtId");

-- CreateIndex
CREATE INDEX "sync_logs_entity_startedAt_idx" ON "sync_logs"("entity", "startedAt");
