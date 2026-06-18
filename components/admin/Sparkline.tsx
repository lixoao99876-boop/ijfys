/** 极简 SVG sparkline（无外部依赖） */
export default function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = "#6366f1",
  fill = "#6366f120",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  if (data.length === 0 || data.every((v) => v === 0)) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#374151" strokeWidth={1} strokeDasharray="2 3" />
        <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize={10} fill="#6b7280">
          暂无
        </text>
      </svg>
    );
  }
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data.map((v, i) => [i * step, height - (v / max) * height]);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width.toFixed(1)},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
