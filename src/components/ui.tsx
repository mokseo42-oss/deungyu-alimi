import { STATUS_LABEL, Status } from "@/lib/model";

const COLOR: Record<Status, string> = {
  ok: "text-ok border-ok",
  call: "text-call border-call",
  empty: "text-empty border-empty",
  check: "text-check border-check",
  ordered: "text-ordered border-ordered",
};

export function StatusBadge({ s }: { s: Status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${COLOR[s]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[s]}
    </span>
  );
}

export function Loading({ error }: { error?: string | null }) {
  return (
    <div className="card p-8 text-center text-muted">
      {error ? `기온 자료를 불러오지 못했습니다: ${error}` : "울주군 기온과 예보를 불러오는 중…"}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`num mt-1 text-2xl font-bold ${tone ?? ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function WeatherNote({ fallback, source }: { fallback: boolean; source: string }) {
  return (
    <p className={`text-xs ${fallback ? "text-empty" : "text-muted"}`}>
      {fallback
        ? "기온 API에 닿지 못해 월별 평년값으로 계산했습니다. 날짜별 값은 실제와 다릅니다."
        : `기온: ${source} (지난 92일 + 앞으로 16일, 그 뒤는 울주 평년 난방도일)`}
    </p>
  );
}
