import data from "@/data/stations.json";

export type Station = { id: string; name: string; addr: string; brand: string; emd: string; kerosene: number };

export const STATIONS: Station[] = data.stations;
export const STATIONS_AS_OF = data.asOf; // 오피넷 내려받은 날
export const ULJU_STATION_TOTAL = 93; // 등유 가격이 없는 곳 포함 (03 기획안 3-1)

export function cheapestIn(emd: string): Station | undefined {
  return STATIONS.filter((s) => s.emd === emd).sort((a, b) => a.kerosene - b.kerosene)[0];
}

export function countyCheapest(): Station {
  return STATIONS[0];
}

export function countyAverage() {
  return STATIONS.reduce((a, s) => a + s.kerosene, 0) / STATIONS.length;
}

export function byEmd(emd: string) {
  return STATIONS.filter((s) => s.emd === emd);
}
