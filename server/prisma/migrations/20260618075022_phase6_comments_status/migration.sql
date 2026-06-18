-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "user_comments_articleId_createdAt_idx";

-- DropIndex
DROP INDEX "user_comments_videoId_createdAt_idx";

-- AlterTable
ALTER TABLE "user_comments" ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "status" "CommentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "user_comments_videoId_status_createdAt_idx" ON "user_comments"("videoId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "user_comments_articleId_status_createdAt_idx" ON "user_comments"("articleId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "user_comments_status_createdAt_idx" ON "user_comments"("status", "createdAt");
