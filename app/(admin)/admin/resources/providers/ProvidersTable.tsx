"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/admin/Badge";
import {
  setProviderStatus,
  triggerProviderSync,
  type AdminProviderRow,
} from "@/lib/admin/api";
import { fmtAgo, fmtMs, fmtNum } from "@/lib/admin/format";

export default function ProvidersTable({ items }: { items: AdminProviderRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function trigger(code: string, type: "full" | "incremental") {
    try {
      setMsg(`已触发 ${code} ${type === "full" ? "全量" : "增量"}同步（后台异步执行，查看"同步任务"页跟踪）`);
      await triggerProviderSync(code, type);
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg(`触发失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function toggle(p: AdminProviderRow) {
    const next = p.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await setProviderStatus(p.code, next);
      setMsg(`${p.code} 已${next === "ACTIVE" ? "启用" : "暂停"}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg(`切换失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <div>
      {msg && (
        <div className="mb-3 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-muted">×</button>
        </div>
      )}
      <div className="rounded-lg border border-white/5 bg-[#0f141d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                <Th>代码</Th>
                <Th>名称</Th>
                <Th>接入地址</Th>
                <Th>状态</Th>
                <Th align="right">视频数(线路)</Th>
                <Th align="right">同步成功率</Th>
                <Th align="right">播放成功率</Th>
                <Th align="right">平均首帧</Th>
                <Th align="right">最近同步</Th>
                <Th align="right">最近错误</Th>
                <Th align="right">操作</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition">
                  <Td><Badge tone="info">{p.code}</Badge></Td>
                  <Td><span className="text-text font-medium">{p.name}</span></Td>
                  <Td>
                    <code className="text-[11px] text-muted font-mono truncate max-w-[280px] inline-block align-middle">
                      {p.baseUrl}
                    </code>
                  </Td>
                  <Td>
                    {p.status === "ACTIVE" ? <Badge tone="success">运行中</Badge> :
                     p.status === "PAUSED" ? <Badge tone="warn">已暂停</Badge> : <Badge tone="error">已停用</Badge>}
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums">{fmtNum(p.sources)}</span>
                  </Td>
                  <Td align="right">
                    {p.syncSuccessRate === null ? <span className="text-muted text-xs">—</span> : (
                      <span className={`tabular-nums text-xs ${p.syncSuccessRate >= 90 ? "text-emerald-300" : p.syncSuccessRate >= 70 ? "text-yellow-300" : "text-red-300"}`}>
                        {p.syncSuccessRate}%
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    {p.playSuccessRate === null ? <span className="text-muted text-xs">待样本</span> : (
                      <span className={`tabular-nums text-xs ${p.playSuccessRate >= 90 ? "text-emerald-300" : p.playSuccessRate >= 70 ? "text-yellow-300" : "text-red-300"}`}>
                        {p.playSuccessRate}% <span className="text-muted ml-1">({p.playSuccessCount + p.playFailCount})</span>
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    {p.avgResponseTimeMs === null ? <span className="text-muted text-xs">—</span> : (
                      <span className="text-muted text-xs tabular-nums">{p.avgResponseTimeMs}ms</span>
                    )}
                  </Td>
                  <Td align="right">
                    <span className="text-muted text-xs tabular-nums">
                      {fmtAgo(p.lastSyncAt) ?? "—"} · {fmtMs(p.lastDurationMs)}
                    </span>
                  </Td>
                  <Td align="right">
                    {p.lastErrorAt ? (
                      <span className="text-red-300 text-xs tabular-nums" title={p.lastErrorMessage ?? ""}>
                        {fmtAgo(p.lastErrorAt)}
                      </span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1.5 text-xs">
                      <button
                        disabled={pending || p.status !== "ACTIVE"}
                        onClick={() => trigger(p.code, "incremental")}
                        className="text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 rounded px-2 py-0.5 disabled:opacity-40"
                      >
                        手动同步
                      </button>
                      <button
                        disabled={pending || p.status !== "ACTIVE"}
                        onClick={() => {
                          if (confirm(`触发 ${p.code} 全量同步？耗时可能数小时（断点续传，可随时中断）`))
                            trigger(p.code, "full");
                        }}
                        className="text-accent border border-accent/30 hover:bg-accent/10 rounded px-2 py-0.5 disabled:opacity-40"
                      >
                        全量同步
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => toggle(p)}
                        className={`rounded px-2 py-0.5 border ${
                          p.status === "ACTIVE"
                            ? "text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/10"
                            : "text-muted border-white/10 hover:text-text"
                        }`}
                      >
                        {p.status === "ACTIVE" ? "暂停" : "启用"}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" | "left" }) {
  return (
    <th
      className={`text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: "right" | "left" }) {
  return <td className={`py-2.5 px-3 align-middle ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
