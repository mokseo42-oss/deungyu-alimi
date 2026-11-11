// 소진 예측 모델 (00 제안서 3-1)
// 남은 기름 = 마지막 배달 뒤 탱크 양 − Σ(기본 사용량 + 집 계수 × 그날 난방도일)
// 숫자는 전부 여기서 계산하고, 대화(AI)는 이 값을 읽기만 한다.

import { MONTHLY_HDD } from "@/data/ulju";

export type Day = {
  date: string; // YYYY-MM-DD
  tmean: number;
  tmin: number;
  src: "obs" | "fcst" | "clim"; // 관측(재분석), 예보, 평년 대체
};

export type HouseParams = {
  tank: number;
  k: number;
  base: number;
};

export const BASE_TEMP = 18;
export const MARGIN = 50; // L
export const MARGIN_COLD = 70; // 한파 예보 때 (03 기획안 4-2)
export const LEAD_DAYS = 7;
// 전화는 예상 소진일이 이 날수 안으로 다가왔을 때만. 하루 1L쯤 쓰는 가을에는 여유분 50L가 50일 치라,
// 잔량 기준만으로는 소진 한 달 반 전에 전화가 간다
export const ALERT_WITHIN = 14;

export const hdd = (t: number) => Math.max(0, BASE_TEMP - t);
export const dailyUse = (p: HouseParams, d: Day) => p.base + p.k * hdd(d.tmean);

// 한파 신호(단순화): 최저 -12℃ 이하, 또는 전날보다 10℃ 넘게 떨어져 3℃ 이하
export function isColdWave(days: Day[], i: number) {
  const d = days[i];
  if (!d) return false;
  if (d.tmin <= -12) return true;
  const prev = days[i - 1];
  return !!prev && prev.tmin - d.tmin >= 10 && d.tmin <= 3;
}

function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysInMonth(date: string) {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// 예보(최대 16일)가 끝난 뒤는 월별 평년 난방도일로 채움
export function extendWithClimate(days: Day[], untilDate: string): Day[] {
  const out = days.slice();
  let last = out[out.length - 1]?.date;
  while (last && last < untilDate) {
    last = addDays(last, 1);
    const m = Number(last.slice(5, 7));
    const h = MONTHLY_HDD[m] / daysInMonth(last);
    const tmean = BASE_TEMP - h;
    out.push({ date: last, tmean, tmin: tmean - 6, src: "clim" });
  }
  return out;
}

export function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function winterEnd(today: string) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  if (m >= 4 && m <= 9) return null; // 난방철 아님
  return m >= 10 ? `${y + 1}-03-31` : `${y}-03-31`;
}

// 시연 가구의 마지막 배달일을 실제 기온으로 거꾸로 찾기
export function anchorStart(
  p: HouseParams,
  days: Day[],
  todayIdx: number,
  startLevel: number,
  demo: { type: "levelToday"; liters: number } | { type: "emptyDaysAgo"; days: number },
): number {
  if (demo.type === "levelToday") {
    let used = 0;
    for (let d = 1; d <= todayIdx; d++) {
      used += dailyUse(p, days[todayIdx - d]);
      if (startLevel - used <= demo.liters) return todayIdx - d;
    }
    return 0;
  }
  const emptyIdx = todayIdx - demo.days;
  let used = 0;
  for (let d = 1; d <= emptyIdx; d++) {
    used += dailyUse(p, days[emptyIdx - d]);
    if (used >= startLevel) return emptyIdx - d;
  }
  return 0;
}

export type Point = { date: string; level: number; use: number; threshold: number; cold: boolean; src: Day["src"] };

export type Projection = {
  points: Point[]; // 시작일부터 (그날 아침 잔량)
  startIdx: number;
  todayIdx: number;
  levelToday: number;
  alertDate: string | null;
  emptyDate: string | null;
  nextWeekCold: boolean;
};

export function threshold(p: HouseParams, days: Day[], i: number) {
  let s = 0;
  let cold = false;
  for (let j = i; j < i + LEAD_DAYS && j < days.length; j++) {
    s += dailyUse(p, days[j]);
    if (isColdWave(days, j)) cold = true;
  }
  return { value: s + (cold ? MARGIN_COLD : MARGIN), cold };
}

export function project(
  p: HouseParams,
  days: Day[],
  startIdx: number,
  startLevel: number,
  todayIdx: number,
): Projection {
  const points: Point[] = [];
  let level = startLevel;
  let emptyDate: string | null = null;
  for (let i = startIdx; i < days.length; i++) {
    const use = dailyUse(p, days[i]);
    const th = threshold(p, days, i);
    points.push({ date: days[i].date, level, use, threshold: th.value, cold: th.cold, src: days[i].src });
    if (!emptyDate && level <= 0) emptyDate = days[i].date;
    level -= use;
  }
  // 알림일: 예상 소진일이 ALERT_WITHIN일 안으로 다가온 날들 가운데, 잔량이 알림 기준 아래인 첫날
  const from = emptyDate && addDays(emptyDate, -ALERT_WITHIN);
  const alertDate = (from && points.find((x) => x.date >= from && x.level < x.threshold)?.date) || null;
  const today = points.find((x) => x.date === days[todayIdx].date);
  return {
    points,
    startIdx,
    todayIdx,
    levelToday: today ? today.level : startLevel,
    alertDate,
    emptyDate,
    nextWeekCold: threshold(p, days, todayIdx).cold,
  };
}

export type Status = "ok" | "call" | "empty" | "check" | "ordered";

export const STATUS_LABEL: Record<Status, string> = {
  ok: "여유",
  call: "먼저 전화",
  empty: "소진 추정",
  check: "살펴봐 주세요",
  ordered: "주문 진행 중",
};

export function statusOf(proj: Projection, today: string, hasOpenOrder: boolean): Status {
  if (hasOpenOrder) return "ordered";
  if (proj.emptyDate && proj.emptyDate <= addDays(today, -7)) return "check";
  if (proj.emptyDate && proj.emptyDate <= today) return "empty";
  if (proj.alertDate && proj.alertDate <= today) return "call";
  return "ok";
}

// 겨울 남은 사용량과 본인 부담 비용(예상 비용 − 바우처 잔액) (03 기획안 3절, 00 제안서 3-4)
export function winterShortfall(p: HouseParams, days: Day[], todayIdx: number, price: number, voucherLeft: number) {
  const end = winterEnd(days[todayIdx].date);
  if (!end) return null;
  let liters = 0;
  for (let i = todayIdx; i < days.length && days[i].date <= end; i++) liters += dailyUse(p, days[i]);
  const cost = liters * price;
  return { liters, cost, shortfall: Math.max(0, cost - voucherLeft), end };
}

// 배달이나 눈금으로 얻은 실제 사용량으로 집 계수 고치기
export function learnK(p: HouseParams, days: Day[], fromIdx: number, toIdx: number, consumed: number, weight: number) {
  let h = 0;
  let n = 0;
  for (let i = fromIdx; i < toIdx; i++) {
    h += hdd(days[i].tmean);
    n++;
  }
  if (h < 20) return p.k; // 너무 따뜻했던 기간이면 고치지 않음
  const kObs = Math.max(0.05, (consumed - p.base * n) / h);
  return Math.round((p.k * (1 - weight) + kObs * weight) * 1000) / 1000;
}

export function indexOfDate(days: Day[], date: string) {
  return days.findIndex((d) => d.date === date);
}

export const fmtDate = (date: string | null) => {
  if (!date) return "—";
  const d = new Date(date + "T00:00:00Z");
  const w = "일월화수목금토"[d.getUTCDay()];
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${w})`;
};

export const fmtWon = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
// 추정 금액은 만 원 단위로만 보여 준다(오차가 20% 안팎인 값을 원 단위까지 적지 않는다)
export const fmtMan = (n: number) => `약 ${Math.round(n / 10000).toLocaleString("ko-KR")}만 원`;
export const fmtL = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}L`;

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

export { addDays };
