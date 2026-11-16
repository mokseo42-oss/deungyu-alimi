// 지난 겨울로 되돌려 보기(검증 화면).
// 울주 지난 겨울의 실제 기온 위에 가상 가구를 얹고, 모델이 '진짜 사용량을 모르는 채로'
// 예측 → 전화 → 배달 → 계수 학습을 하루씩 되풀이한 뒤, 기름이 떨어지기 전에 배달됐는지를 채점한다.
//
// 공정하게 하려고 지킨 것
// - 가구의 진짜 집 계수·기본 사용량은 모델에 알려 주지 않는다. 모델은 지역 중앙값(0.5)에서 시작해 배달 기록으로만 배운다
// - 진짜 하루 사용량은 기온 공식에 날마다 흔들림(기본 ±35%)을 곱한 값이다
// - 모델은 미래 기온을 모른다. 앞 7일은 실제 기온에 예보 오차(표준편차 1.5℃)를 더한 값, 그 뒤는 예년 평균을 쓴다
// - 반 드럼(100L)씩 사는 집은 배달 뒤 실제 잔량을 알 수 없어, 그때는 계수를 고치지 않는다
// - 배달은 전화한 날부터 1~3일 뒤(무작위)
// 담지 못한 것: 난방을 참는 집의 갑작스러운 변화, 집을 비운 기간, 다른 데서 산 기름, 전화를 안 받는 경우

import type { Day, HouseParams } from "@/lib/model";
import { addDays, extendWithClimate, learnK, project } from "@/lib/model";

export type Method = "model" | "flat";

export const MIN_DELIVERY = 50; // 넣을 자리가 이보다 적으면 판매소가 넣지 않고 돌아간다

export type BtOptions = {
  households: number; // 가상 가구 수(시연 가구 A·B·C 포함)
  noise: number; // 하루 사용량 흔들림(0.35 = ±35% 안팎)
  delayMin: number; // 전화한 날부터 배달까지 최소 날수
  delayMax: number;
  forecastSd: number; // 예보 오차(℃)
  k0: number; // 모델이 처음 쓰는 집 계수(지역 중앙값)
  base0: number; // 모델이 처음 쓰는 기본 사용량(L/일)
  registration: boolean; // 가입 때 지난겨울 사용량으로 첫 계수를 정하나
  seed: number;
};

export const DEFAULT_OPTS: BtOptions = {
  households: 150,
  noise: 0.35,
  delayMin: 1,
  delayMax: 3,
  forecastSd: 1.5,
  k0: 0.5,
  base0: 1.0,
  registration: true,
  seed: 20251001,
};

export type Truth = { id: string; label: string; k: number; base: number; tank: number; start: number; half: boolean };

export type SeriesPoint = {
  date: string;
  tmean: number;
  trueLevel: number; // 그날 아침 실제 잔량
  modelLevel: number; // 그날 아침 모델이 생각한 잔량
  call?: boolean;
  delivered?: number;
};

export type HouseResult = {
  truth: Truth;
  calls: { date: string; trueDaysLeft: number }[];
  deliveries: { date: string; liters: number; beforeEmpty: boolean }[];
  skips: number; // 넣을 자리가 없어 눈금만 보고 돌아간 횟수
  kErr: number[]; // 배달마다 계수 오차(진짜 대비 비율). 0번은 처음 값
  ranOut: number; // 기름이 바닥난 횟수
  dryDays: number; // 바닥난 채 지낸 날
  series: SeriesPoint[];
};

export type Summary = {
  method: Method;
  houses: number;
  deliveries: number;
  onTime: number; // 바닥나기 전에 배달된 횟수
  ranOutHouses: number; // 한 번이라도 바닥난 집
  ranOut: number;
  dryDays: number;
  skips: number;
  leadDays: number[]; // 전화한 날 실제로 남아 있던 날수
  kErrByDelivery: number[][]; // [배달 순번][집]
};

// 다 끝난 가장 최근 겨울. 11월이면 작년 10월 ~ 올해 3월
export function lastWinter(today: string) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const end = m >= 4 ? y : y - 1;
  return { from: `${end - 1}-10-01`, to: `${end}-03-31` };
}

// 같은 seed면 같은 결과(시연 때 숫자가 바뀌지 않게)
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number) {
  const u = Math.max(1e-9, r());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

// 시연 가구 A·B·C(households.ts와 같은 값) + 무작위 가구
export function makeTruths(o: BtOptions): Truth[] {
  const r = rng(o.seed);
  const out: Truth[] = [
    { id: "A", label: "상북면 A 할머니형", k: 0.5, base: 1.0, tank: 200, start: 120, half: false },
    { id: "B", label: "두서면 B 부부형", k: 0.65, base: 1.2, tank: 200, start: 150, half: false },
    { id: "C", label: "두동면 C 할머니형(적게 씀, 반 드럼)", k: 0.24, base: 0.8, tank: 200, start: 60, half: true },
  ];
  for (let i = out.length; i < o.households; i++) {
    out.push({
      id: `v${i}`,
      label: `가상 가구 ${i - 2}`,
      k: Math.round((0.25 + 0.55 * r()) * 100) / 100,
      base: Math.round((0.5 + r()) * 10) / 10,
      tank: 200,
      start: Math.round(40 + 160 * r()),
      half: r() < 0.3,
    });
  }
  return out;
}

// 그날(i) 모델이 볼 수 있는 기온: 어제까지 실제, 앞 7일은 실제+예보 오차, 그 뒤는 예년 평균
export function viewsFor(days: Day[], o: BtOptions): Day[][] {
  const r = rng(o.seed ^ 0x5eed);
  // 실제 서비스처럼 겨울 끝(3/31) 뒤도 예년 평균으로 이어 붙여, 4월 초 소진도 미리 볼 수 있게 한다
  const last = addDays(days[days.length - 1].date, 45);
  return days.map((_, i) => {
    const fcst = days.slice(i, i + 7).map((d) => {
      const e = gauss(r) * o.forecastSd * (1 + (d.date > days[i].date ? 0.15 : 0));
      return { ...d, tmean: d.tmean + e, tmin: d.tmin + e, src: "fcst" as const };
    });
    return extendWithClimate([...days.slice(0, i), ...fcst], last);
  });
}

export function runHouse(t: Truth, days: Day[], views: Day[][], o: BtOptions, method: Method): HouseResult {
  const r = rng(o.seed + t.id.split("").reduce((a, c) => a + c.charCodeAt(0) * 131, 7));  // 두 방식이 같은 진짜 사용량을 쓰게 같은 seed
  // 진짜 하루 사용량(배달과 상관없이 정해짐)
  const trueUse = days.map((d) => Math.max(0, (t.base + t.k * Math.max(0, 18 - d.tmean)) * Math.max(0.2, 1 + gauss(r) * o.noise)));
  const delays = days.map(() => o.delayMin + Math.floor(r() * (o.delayMax - o.delayMin + 1)));

  // 첫 계수: 가입 때 "지난겨울 몇 번, 얼마나 넣으셨어요?"로 정한 대략값(진짜와 ±25% 안팎 차이).
  // registration을 끄면 모두 지역 중앙값(0.5)에서 시작한다
  const kInit = o.registration ? Math.min(1.2, Math.max(0.12, t.k * (1 + gauss(r) * 0.25))) : o.k0;
  // 모델이 아는 값. 기온을 보지 않는 방식(flat)은 하루 평균 사용량 하나로 잰다
  const avgHdd = days.reduce((a, d) => a + Math.max(0, 18 - d.tmean), 0) / days.length;
  let p: HouseParams =
    method === "model" ? { tank: t.tank, k: kInit, base: o.base0 } : { tank: t.tank, k: 0, base: o.base0 + kInit * avgHdd };
  const kOf = (q: HouseParams) => (method === "model" ? q.k : (q.base - o.base0) / avgHdd);
  const kErr = [Math.abs(kOf(p) - t.k) / t.k];

  let level = t.start;
  let startIdx = 0;
  let startLevel = t.start; // 모델이 아는 마지막 잔량(가입 때 눈금)
  let pending: number | null = null; // 판매소가 올 날(인덱스)
  let dry = false;
  const res: HouseResult = { truth: t, calls: [], deliveries: [], skips: 0, kErr, ranOut: 0, dryDays: 0, series: [] };

  // 판매소가 본 잔량으로 계수를 고친다. weight: 정확히 알면 0.5, 눈금(네 칸)으로 봤으면 0.3
  const learn = (i: number, seenBefore: number, weight: number) => {
    const consumed = startLevel - seenBefore;
    if (method === "model") p = { ...p, k: learnK(p, days, startIdx, i, consumed, weight) };
    else {
      const n = i - startIdx;
      if (n > 0 && consumed > 0) p = { ...p, base: Math.round((p.base * (1 - weight) + (consumed / n) * weight) * 100) / 100 };
    }
    res.kErr.push(Math.abs(kOf(p) - t.k) / t.k);
  };

  for (let i = 0; i < days.length; i++) {
    const pt: SeriesPoint = { date: days[i].date, tmean: days[i].tmean, trueLevel: Math.max(0, level), modelLevel: 0 };

    // 1) 판매소 방문
    if (pending === i) {
      const before = Math.max(0, level);
      const room = t.tank - before;
      const quarter = t.tank / 4;
      const seen = Math.round(before / quarter) * quarter; // 판매소가 눈금(네 칸)으로 본 잔량
      if (room < MIN_DELIVERY) {
        // 넣을 자리가 없어 눈금만 보고 돌아감. 그 눈금으로 계산을 고친다
        res.skips++;
        learn(i, seen, 0.3);
        startIdx = i;
        startLevel = seen;
      } else {
        const liters = Math.round(t.half ? Math.min(100, room) : room);
        res.deliveries.push({ date: days[i].date, liters, beforeEmpty: level > 0 });
        // 가득 채우면 배달 직전 잔량을 정확히 안다(탱크 − 넣은 양). 반 드럼이면 눈금으로 본 값만 안다
        learn(i, t.half ? seen : before, t.half ? 0.3 : 0.5);
        startIdx = i;
        startLevel = t.half ? Math.min(t.tank, seen + liters) : t.tank;
        level = before + liters;
        dry = false;
      }
      pending = null;
    }

    // 2) 모델의 오늘 판단
    const proj = project(p, views[i], startIdx, startLevel, i);
    pt.trueLevel = Math.max(0, level);
    pt.modelLevel = Math.max(0, proj.levelToday);
    if (pending === null) {
      const today = days[i].date;
      const call = (proj.alertDate && proj.alertDate <= today) || (proj.emptyDate && proj.emptyDate <= today);
      if (call) {
        pt.call = true;
        // 전화한 날 실제로 며칠 치가 남았나
        let left = level;
        let n = 0;
        for (let j = i; j < days.length && left > 0; j++, n++) left -= trueUse[j];
        res.calls.push({ date: today, trueDaysLeft: left > 0 ? n : n - 1 });
        pending = Math.min(days.length - 1, i + delays[i]);
        if (pending === i) pending = null;
      }
    }

    // 3) 하루 쓰기
    level -= trueUse[i];
    if (level <= 0) {
      if (!dry) res.ranOut++;
      dry = true;
      res.dryDays++;
      level = 0;
    }
    if (pt.call === undefined) delete pt.call;
    res.series.push(pt);
  }
  // 배달된 날 표시
  for (const d of res.deliveries) {
    const s = res.series.find((x) => x.date === d.date);
    if (s) s.delivered = d.liters;
  }
  return res;
}

export function summarize(method: Method, houses: HouseResult[]): Summary {
  const kErrByDelivery: number[][] = [];
  houses.forEach((h) => h.kErr.forEach((e, i) => (kErrByDelivery[i] ??= []).push(e)));
  return {
    method,
    houses: houses.length,
    deliveries: houses.reduce((a, h) => a + h.deliveries.length, 0),
    onTime: houses.reduce((a, h) => a + h.deliveries.filter((d) => d.beforeEmpty).length, 0),
    ranOutHouses: houses.filter((h) => h.ranOut > 0).length,
    ranOut: houses.reduce((a, h) => a + h.ranOut, 0),
    dryDays: houses.reduce((a, h) => a + h.dryDays, 0),
    skips: houses.reduce((a, h) => a + h.skips, 0),
    leadDays: houses.flatMap((h) => h.calls.map((c) => c.trueDaysLeft)),
    kErrByDelivery,
  };
}

export function runBacktest(days: Day[], o: BtOptions = DEFAULT_OPTS) {
  const truths = makeTruths(o);
  const views = viewsFor(days, o);
  const model = truths.map((t) => runHouse(t, days, views, o, "model"));
  const flat = truths.map((t) => runHouse(t, days, views, o, "flat"));
  return { model, flat, sModel: summarize("model", model), sFlat: summarize("flat", flat) };
}

export const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const quantile = (xs: number[], q: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
};

export { addDays };
