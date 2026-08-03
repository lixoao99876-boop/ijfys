-- Yandex recrawl 队列优先级：越大越先 drain
ALTER TABLE "yandex_recrawl_queue" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "yandex_recrawl_queue_status_priority_idx" ON "yandex_recrawl_queue"("status", "priority");
