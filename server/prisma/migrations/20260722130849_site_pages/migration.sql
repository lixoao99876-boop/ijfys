-- 站点内容页（资讯/公告）
CREATE TYPE "SitePageKind" AS ENUM ('NEWS', 'ANNOUNCEMENT');

CREATE TABLE "site_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "SitePageKind" NOT NULL DEFAULT 'NEWS',
    "body" TEXT NOT NULL,
    "summary" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "site_pages_slug_key" ON "site_pages"("slug");
CREATE INDEX "site_pages_kind_published_idx" ON "site_pages"("kind", "published");
