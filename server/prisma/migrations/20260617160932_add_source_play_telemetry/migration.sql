-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "avgResponseTimeMs" INTEGER,
ADD COLUMN     "playFailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "playSuccessCount" INTEGER NOT NULL DEFAULT 0;
