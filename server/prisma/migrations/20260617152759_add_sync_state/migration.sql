-- CreateEnum
CREATE TYPE "SyncStateStatus" AS ENUM ('IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "sync_states" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "entity" "SyncEntity" NOT NULL,
    "lastCompletedPage" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SyncStateStatus" NOT NULL DEFAULT 'IDLE',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_states_providerId_entity_key" ON "sync_states"("providerId", "entity");

-- AddForeignKey
ALTER TABLE "sync_states" ADD CONSTRAINT "sync_states_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
