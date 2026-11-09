"use client";
import { useEffect, useMemo, useState } from "react";
import { HOUSEHOLDS, Household } from "@/data/households";
import { EMDS } from "@/data/ulju";
import {
  Day,
  HouseParams,
  Projection,
  Status,
  addDays,
  anchorStart,
  extendWithClimate,
  indexOfDate,
  project,
  statusOf,
  winterEnd,
  winterShortfall,
} from "./model";
import { State, openOrder, useStore } from "./store";

export type Weather = { today: string; fallback: boolean; source: string; byEmd: Record<string, Day[]> };

let weatherPromise: Promise<Weather> | null = null;
function loadWeather() {
  if (!weatherPromise) {
    weatherPromise = fetch("/api/weather")
      .then((r) => r.json())
      .catch((e) => {
        weatherPromise = null;
        throw e;
      });
  }
  return weatherPromise;
}

export function useWeather() {
  const [w, setW] = useState<Weather | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    loadWeather().then(setW, (e) => setErr(String(e)));
  }, []);
  return { weather: w, error: err };
}

export type View = {
  h: Household;
  params: HouseParams;
  days: Day[];
  todayIdx: number;
  startDate: string;
  startLevel: number;
  proj: Projection;
  status: Status;
  price: number;
  shortfall: ReturnType<typeof winterShortfall>;
  orderId?: string;
};

function prepDays(raw: Day[], today: string) {
  const end = winterEnd(today);
  const until = end && end > addDays(today, 60) ? end : addDays(today, 60);
  return extendWithClimate(raw, until);
}

export function buildView(h: Household, raw: Day[], today: string, s: State): View {
  const days = prepDays(raw, today);
  const todayIdx = Math.max(0, indexOfDate(days, today));
  const params: HouseParams = { tank: h.tank, k: s.kOverride[h.id] ?? h.k, base: h.base };

  let startIdx: number;
  let startLevel: number;
  const del = s.deliveries[h.id];
  if (del) {
    startIdx = Math.max(0, indexOfDate(days, del.date));
    startLevel = del.litersAfter;
  } else {
    startLevel = h.lastDeliveryLiters;
    startIdx = anchorStart({ ...params, k: h.k }, days, todayIdx, startLevel, h.demo);
  }
  const g = s.gauges[h.id];
  if (g && g.date >= days[startIdx].date) {
    const gi = indexOfDate(days, g.date);
    if (gi >= 0) {
      startIdx = gi;
      startLevel = g.level;
    }
  }
  const proj = project(params, days, startIdx, startLevel, todayIdx);
  const oo = openOrder(s, h.id);
  const price = s.dealerPrices[h.dealer] ?? h.dealerPrice;
  return {
    h,
    params,
    days,
    todayIdx,
    startDate: days[startIdx].date,
    startLevel,
    proj,
    status: statusOf(proj, today, !!oo),
    price,
    shortfall: winterShortfall(params, days, todayIdx, price, h.voucherLeft),
    orderId: oo?.id,
  };
}

export function useHouseholds() {
  const { weather, error } = useWeather();
  const s = useStore();
  const views = useMemo(() => {
    if (!weather) return null;
    return HOUSEHOLDS.map((h) => buildView(h, weather.byEmd[h.emd] ?? Object.values(weather.byEmd)[0], weather.today, s));
  }, [weather, s]);
  return { weather, error, views, store: s };
}

// ---- 현황판용 가상 등록 가구 (결정적 난수) ----
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function syntheticHouseholds(): Household[] {
  const r = rng(20261109);
  const out: Household[] = [];
  for (const e of EMDS) {
    const n = e.priority === 1 ? 30 : e.priority === 2 ? 14 : 4;
    for (let i = 1; i <= n; i++) {
      const holding = r() < 0.06;
      // 대부분은 여유, 일부(약 15%)만 알림 기준 근처에 있도록 분포를 잡음
      const lvl = r() < 0.15 ? 40 + Math.round(50 * r()) : 115 + Math.round(85 * r());
      const k = holding ? 0.17 + 0.07 * r() : 0.3 + 0.4 * r();
      out.push({
        id: `${e.name}-${i}`,
        label: `${e.name} 가상 ${i}`,
        person: `가상 등록 가구 ${i}`,
        emd: e.name,
        lat: e.lat,
        lon: e.lon,
        tank: 200,
        k: Math.round(k * 100) / 100,
        base: Math.round((0.5 + r()) * 10) / 10,
        lastDeliveryLiters: holding ? 60 + Math.round(60 * r()) : 200,
        demo: holding
          ? { type: "emptyDaysAgo", days: 8 + Math.floor(12 * r()) }
          : { type: "levelToday", liters: lvl },
        channel: r() < 0.3 ? "AI 스피커" : "AI 전화",
        approval: "기본",
        dealer: "가상 판매소",
        dealerPrice: 1540 + Math.round(60 * r()),
        voucherLeft: r() < 0.5 ? 442200 : 0,
        scenario: "",
        notes: [],
      });
    }
  }
  return out;
}

export function useRegistry() {
  const { weather, error, views, store } = useHouseholds();
  const synth = useMemo(() => {
    if (!weather) return null;
    const empty: State = { ...store, deliveries: {}, gauges: {}, kOverride: {}, orders: [] };
    return syntheticHouseholds().map((h) => buildView(h, weather.byEmd[h.emd], weather.today, empty));
    // 가상 가구는 시연 조작의 영향을 받지 않음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather]);
  return { weather, error, views, synth, store };
}

export function suggestLiters(tank: number, level: number) {
  const room = tank - Math.max(0, level);
  return Math.min(tank, Math.max(100, Math.floor(room / 10) * 10));
}
