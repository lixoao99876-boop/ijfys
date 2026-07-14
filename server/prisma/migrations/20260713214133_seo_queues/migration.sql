-- CreateTable
CREATE TABLE "bing_retry_queue" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_retry',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bing_retry_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yandex_recrawl_queue" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_retry',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yandex_recrawl_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bing_retry_queue_url_key" ON "bing_retry_queue"("url");

-- CreateIndex
CREATE INDEX "bing_retry_queue_status_idx" ON "bing_retry_queue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "yandex_recrawl_queue_url_key" ON "yandex_recrawl_queue"("url");

-- CreateIndex
CREATE INDEX "yandex_recrawl_queue_status_idx" ON "yandex_recrawl_queue"("status");
