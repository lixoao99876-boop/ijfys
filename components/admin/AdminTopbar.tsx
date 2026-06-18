import Link from "next/link";

export default function AdminTopbar() {
  return (
    <header className="h-12 bg-[#0a0d14] border-b border-white/5 flex items-center justify-between px-5">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
          预览模式
        </span>
        <span>架构骨架阶段 · 业务逻辑陆续接入</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <Link href="/" className="text-muted hover:text-text" target="_blank">
          访问前台 ↗
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent" />
          <span className="text-text">admin</span>
        </div>
      </div>
    </header>
  );
}
