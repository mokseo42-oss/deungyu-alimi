import { STATUS_LABEL, Status } from "@/lib/model";

const COLOR: Record<Status, string> = {
  ok: "text-ok",
  call: "text-call",
  empty: "text-empty",
  check: "text-check",
  ordered: "text-ordered",
};

export function StatusBadge({ s }: { s: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold ${COLOR[s]}`}>
      <span className="h-2 w-2 bg-current" />
      {STATUS_LABEL[s]}
    </span>
  );
}

export function Loading({ error }: { error?: string | null }) {
  return (
    <div className="border-y border-line py-16 text-center text-muted">
      {error ? `기온 자료를 불러오지 못했습니다: ${error}` : "울주군 기온과 예보를 불러오는 중…"}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="fig">
      <div className="fig-label">{label}</div>
      <div className={`fig-value ${tone ?? ""}`}>{value}</div>
      {sub && <div className="fig-sub">{sub}</div>}
    </div>
  );
}

// 탱크 옆 눈금 호스. 네 칸 눈금에 남은 기름만큼 주황으로 찬다
export function SightGauge({ ratio, height = 112 }: { ratio: number; height?: number }) {
  const r = Math.max(0, Math.min(1, ratio));
  return (
    <div className="sight" style={{ height }} role="img" aria-label={`탱크 눈금 ${Math.round(r * 100)}%`}>
      <span className="sight-fill" style={{ transform: `scaleY(${r})` }} />
      {[25, 50, 75].map((t) => (
        <span key={t} className="sight-notch" style={{ top: `${t}%` }} />
      ))}
    </div>
  );
}

export function WeatherNote({ fallback, source }: { fallback: boolean; source: string }) {
  return (
    <p className={`mt-3 text-sm ${fallback ? "text-empty" : "text-muted"}`}>
      {fallback
        ? "기온 API에 닿지 못해 월별 예년 평균(최근 세 겨울)으로 계산했습니다. 날짜별 값은 실제와 다릅니다."
        : `기온: ${source} (지난 92일 + 앞으로 16일, 그 뒤는 울주 예년 평균 난방도일. 예년 평균은 최근 세 겨울 평균)`}
    </p>
  );
}
