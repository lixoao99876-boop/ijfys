import Link from "next/link";
import { getFooterLinks } from "@/lib/api";
import { SITE_NAME, SITE_HOST, SITE_NAME_HEAD, SITE_NAME_TAIL } from "@/lib/site";

/** 站点底部：帮助/政策等信息页链接（后台可编辑），服务端渲染利于 SEO */
export default async function Footer() {
  let links: { slug: string; title: string }[] = [];
  try {
    links = await getFooterLinks();
  } catch {
    links = [];
  }

  return (
    <footer className="mt-12 border-t border-white/5 bg-surface/40">
      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-16">
          {/* 品牌 */}
          <div className="md:max-w-xs">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <img src="/logo2.png" alt={SITE_NAME} width={28} height={28} className="rounded" />
              <span className="text-lg font-bold">
                {SITE_NAME_HEAD}<span className="text-primary">{SITE_NAME_TAIL}</span>
              </span>
            </Link>
            <p className="text-sm text-muted leading-relaxed">
              {SITE_NAME}汇聚电影、影视剧、AI 短剧、综艺、动漫等海量高清资源，在线播放、每日更新、免费观看。
            </p>
          </div>

          {/* 帮助与信息 */}
          <div className="flex-1">
            <div className="text-sm font-semibold text-text mb-3">帮助与信息</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
              {links.map((l) => (
                <Link
                  key={l.slug}
                  href={`/info/${l.slug}`}
                  className="text-sm text-muted hover:text-text transition"
                >
                  {l.title}
                </Link>
              ))}
              <Link href="/announcements" className="text-sm text-muted hover:text-text transition">
                最新公告
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-xs text-muted/70 leading-relaxed">
          <p>
            本站为影视信息聚合平台，所有内容均来自第三方公开资源，本站不存储任何视频文件。如有侵权请通过「联系我们」告知，我们将及时处理。
          </p>
          <p className="mt-2">© {new Date().getFullYear()} {SITE_HOST} · 保留所有权利</p>
        </div>
      </div>
    </footer>
  );
}
