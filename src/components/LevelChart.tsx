"use client";
import { useState } from "react";
import { View } from "@/lib/useModel";
import { fmtDate, fmtL } from "@/lib/model";

// 잔량 그래프: 실선=지난 기온으로 계산, 굵은 주황=예보, 점선=평년값. 회색 점선=알림 기준(7일 쓸 양+여유분)
export default function LevelChart({ v, horizon = 30 }: { v: View; horizon?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = v.proj.points;
  const today = v.days[v.todayIdx].date;
  const ti = pts.findIndex((p) => p.date === today);
  const end = Math.min(pts.length, (ti < 0 ? 0 : ti) + horizon + 1);
  const shown = pts.slice(0, end);
  const W = 640,
    H = 220,
    L = 40,
    R = 10,
    T = 12,
    B = 26;
  const maxY = Math.max(v.params.tank, ...shown.map((p) => p.level));
  const minY = Math.min(0, ...shown.map((p) => p.level));
  const x = (i: number) => L + (i / Math.max(1, shown.length - 1)) * (W - L - R);
  const y = (val: number) => T + (1 - (val - minY) / (maxY - minY)) * (H - T - B);
  const path = (filter: (src: string) => boolean) => {
    let d = "";
    shown.forEach((p, i) => {
      const prevOk = i > 0 && filter(shown[i - 1].src);
      if (filter(p.src) || prevOk) d += `${d && prevOk ? "L" : "M"}${x(i).toFixed(1)},${y(p.level).toFixed(1)}`;
    });
    return d;
  };
  const th = shown.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.threshold).toFixed(1)}`).join("");
  const alertI = shown.findIndex((p) => p.date === v.proj.alertDate);
  const emptyI = shown.findIndex((p) => p.date === v.proj.emptyDate);
  const h = hover != null ? shown[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="예상 잔량 그래프"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - L) / (W - L - R)) * (shown.length - 1));
          setHover(Math.max(0, Math.min(shown.length - 1, i)));
        }}
      >
        {[0, 50, 100, 150, 200].filter((t) => t <= maxY).map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={L - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}
        {minY < 0 && <rect x={L} y={y(0)} width={W - L - R} height={y(minY) - y(0)} fill="var(--empty)" opacity="0.07" />}
        <path d={th} fill="none" stroke="var(--chart-th)" strokeDasharray="4 4" strokeWidth="1.5" />
        <path d={path((s) => s === "obs")} fill="none" stroke="var(--ink)" strokeWidth="1.75" />
        <path d={path((s) => s === "fcst")} fill="none" stroke="var(--chart-fcst)" strokeWidth="3" />
        <path d={path((s) => s === "clim")} fill="none" stroke="var(--chart-fcst)" strokeWidth="2" strokeDasharray="2 4" />
        {ti >= 0 && (
          <g>
            <line x1={x(ti)} x2={x(ti)} y1={T} y2={H - B} stroke="var(--ink)" strokeWidth="1" />
            <text x={x(ti) + 4} y={T + 10} fontSize="11" fill="var(--ink)">
              오늘
            </text>
          </g>
        )}
        {alertI >= 0 && <circle cx={x(alertI)} cy={y(shown[alertI].level)} r="5" fill="#ffffff" stroke="var(--ink)" strokeWidth="2" />}
        {emptyI >= 0 && <circle cx={x(emptyI)} cy={y(0)} r="5" fill="var(--empty)" />}
        {shown.map((p, i) =>
          p.cold && p.src !== "obs" ? <rect key={p.date} x={x(i) - 2} y={H - B + 2} width="4" height="5" fill="var(--cold)" /> : null,
        )}
        <text x={L} y={H - 6} fontSize="11" fill="var(--muted)">
          {fmtDate(shown[0]?.date ?? null)}
        </text>
        <text x={W - R} y={H - 6} fontSize="11" textAnchor="end" fill="var(--muted)">
          {fmtDate(shown[shown.length - 1]?.date ?? null)}
        </text>
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="2 2" />}
      </svg>
      {h && (
        <div className="pointer-events-none absolute right-2 top-2 border border-ink bg-panel px-3 py-2 text-xs">
          <div className="font-semibold">{fmtDate(h.date)}</div>
          <div className="num">
            잔량 {fmtL(h.level)} · 하루 {h.use.toFixed(1)}L
          </div>
          <div className="num text-muted">
            알림 기준 {fmtL(h.threshold)} {h.cold ? "(한파)" : ""} · {h.src === "obs" ? "지난 기온" : h.src === "fcst" ? "예보" : "평년값"}
          </div>
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="w-5 border-t-2 border-ink" />
          지난 기온으로 계산
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="w-5 border-t-[3px] border-fuel" />
          예보
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="w-5 border-t-2 border-dotted border-fuel" />
          평년값
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="w-5 border-t-2 border-dashed border-[#9a9a9a]" />
          알림 기준
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-white" />
          알림일
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-empty" />
          소진일
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-1.5 bg-cold" />
          한파 예보
        </li>
      </ul>
    </div>
  );
}
