"use client";
import { useEffect, useMemo, useState } from "react";
import data from "@/data/stations.json";

export type Station = { id: string; name: string; addr: string; brand: string; emd: string; kerosene: number; live?: boolean };

export const STATIONS: Station[] = data.stations;
export const STATIONS_AS_OF = data.asOf; // 오피넷 내려받은 날
export const ULJU_STATION_TOTAL = 93; // 등유 가격이 없는 곳 포함 (03 기획안 3-1)

// 실시간 가격이 있는 곳을 먼저 보고, 그 읍면에 실시간 자료가 없을 때만 저장 자료를 씀
export function cheapestIn(list: Station[], emd: string): Station | undefined {
  const here = list.filter((s) => s.emd === emd);
  const live = here.filter((s) => s.live);
  return (live.length ? live : here).sort((a, b) => a.kerosene - b.kerosene)[0];
}

export function byEmd(list: Station[], emd: string) {
  return list.filter((s) => s.emd === emd);
}

type Live = {
  live: boolean;
  asOf?: string;
  reason?: string;
  average?: { price: number; diff: number } | null;
  stations?: Station[];
};

let livePromise: Promise<Live> | null = null;
function loadLive() {
  livePromise ??= fetch("/api/prices")
    .then((r) => r.json() as Promise<Live>)
    .catch((e) => ({ live: false, reason: String(e) }));
  return livePromise;
}

export type StationsView = {
  stations: Station[];
  live: boolean;
  asOf: string;
  liveCount: number;
  average: { price: number; diff: number } | null;
  reason?: string;
};

// 오피넷 실시간(최저가 20곳)으로 저장 자료를 덮어쓴다. 실시간에 없는 곳은 저장 자료 가격을 유지
export function mergeStations(l: Live | null): StationsView {
  if (!l?.live || !l.stations) {
    return { stations: STATIONS, live: false, asOf: STATIONS_AS_OF, liveCount: 0, average: null, reason: l?.reason };
  }
  const map = new Map(STATIONS.map((s) => [s.id, { ...s }]));
  for (const s of l.stations) {
    const old = map.get(s.id);
    map.set(s.id, { ...(old ?? s), kerosene: s.kerosene, emd: old?.emd || s.emd, live: true });
  }
  const stations = [...map.values()].filter((s) => s.emd).sort((a, b) => a.kerosene - b.kerosene);
  return { stations, live: true, asOf: l.asOf ?? "", liveCount: l.stations.length, average: l.average ?? null };
}

export function useStations(): StationsView {
  const [l, setL] = useState<Live | null>(null);
  useEffect(() => {
    loadLive().then(setL);
  }, []);
  return useMemo(() => mergeStations(l), [l]);
}
