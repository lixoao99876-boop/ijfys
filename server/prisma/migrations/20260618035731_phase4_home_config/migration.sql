-- CreateEnum
CREATE TYPE "HomeChannelKind" AS ENUM ('BANNER', 'CUSTOM');

-- CreateTable
CREATE TABLE "home_channels" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "HomeChannelKind" NOT NULL DEFAULT 'CUSTOM',
    "categoryFilter" TEXT,
    "order" INTEGER NOT NULL DEFAULT 100,
    "itemLimit" INTEGER NOT NULL DEFAULT 12,
    "fillFromDb" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_channel_items" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_channel_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stats" (
    "date" DATE NOT NULL,
    "pv" INTEGER NOT NULL DEFAULT 0,
    "uv" INTEGER NOT NULL DEFAULT 0,
    "ip" INTEGER NOT NULL DEFAULT 0,
    "dau" INTEGER NOT NULL DEFAULT 0,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_channels_code_key" ON "home_channels"("code");

-- CreateIndex
CREATE INDEX "home_channels_order_idx" ON "home_channels"("order");

-- CreateIndex
CREATE INDEX "home_channel_items_channelId_order_idx" ON "home_channel_items"("channelId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "home_channel_items_channelId_videoId_key" ON "home_channel_items"("channelId", "videoId");

-- AddForeignKey
ALTER TABLE "home_channel_items" ADD CONSTRAINT "home_channel_items_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "home_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
