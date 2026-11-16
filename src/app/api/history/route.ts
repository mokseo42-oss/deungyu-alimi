// 검증 화면용: 울주군 12개 읍면의 지난 겨울(10/1~3/31) 실제 일평균·최저기온 (Open-Meteo 과거 기온 API, 키 없음)
// 지난 겨울 자료는 바뀌지 않으므로 하루 동안 저장해 둔다.
import { NextResponse } from "next/server";
import { EMDS } from "@/data/ulju";
import { Day, todayKST } from "@/lib/model";
import { lastWinter } from "@/lib/backtest";

export const revalidate = 86400;

type OM = { daily: { time: string[]; temperature_2m_mean: (number | null)[]; temperature_2m_min: (number | null)[] } };

export async function GET() {
  const season = lastWinter(todayKST());
  const lat = EMDS.map((e) => e.lat).join(",");
  const lon = EMDS.map((e) => e.lon).join(",");
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${season.from}&end_date=${season.to}&daily=temperature_2m_mean,temperature_2m_min&timezone=Asia%2FSeoul`;
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`open-meteo archive ${res.status}`);
    const json = (await res.json()) as OM | OM[];
    const list = Array.isArray(json) ? json : [json];
    const byEmd: Record<string, Day[]> = {};
    list.forEach((loc, i) => {
      const d = loc.daily;
      byEmd[EMDS[i].name] = d.time.flatMap((t, j) => {
        const m = d.temperature_2m_mean[j];
        const n = d.temperature_2m_min[j];
        return m == null || n == null ? [] : [{ date: t, tmean: m, tmin: n, src: "obs" as const }];
      });
    });
    return NextResponse.json({ season, source: "Open-Meteo 과거 기온 API (ERA5 재분석)", byEmd });
  } catch (e) {
    return NextResponse.json({ season, error: String(e).slice(0, 200), byEmd: {} }, { status: 502 });
  }
}
