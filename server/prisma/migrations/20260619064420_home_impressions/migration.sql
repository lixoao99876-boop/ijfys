-- CreateTable
CREATE TABLE "home_impressions" (
    "videoId" TEXT NOT NULL,
    "channelCode" TEXT NOT NULL,
    "showCount" INTEGER NOT NULL DEFAULT 0,
    "lastShownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_impressions_pkey" PRIMARY KEY ("videoId", "channelCode")
);

-- CreateIndex
CREATE INDEX "home_impressions_channelCode_showCount_idx" ON "home_impressions"("channelCode", "showCount");
