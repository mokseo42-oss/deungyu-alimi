// 울주군 12개 읍면의 지난 92일 + 앞으로 16일 일평균·최저기온 (Open-Meteo, 키 없음)
// 실패하면 월별 예년 평균(최근 세 겨울)으로 대체하고 fallback=true를 돌려준다.
import { NextResponse } from "next/server";
import { EMDS } from "@/data/ulju";
import { Day, extendWithClimate, todayKST, addDays } from "@/lib/model";

// 응답 전체를 1시간 저장한다. Vercel(서울)에서 Open-Meteo를 부르면 매번 10초쯤 걸려(이 PC에서는 0.8초),
// 요청마다 새로 받으면 앱 화면이 10초 동안 비어 있었다(2026-11-18 실측).
// 한동안 아무도 열지 않으면 첫 방문자는 며칠 전에 만든 응답을 받을 수 있는데, '오늘'은 브라우저가 고쳐 쓴다(useModel.ts)
export const revalidate = 3600;

type OM = {
  daily: { time: string[]; temperature_2m_mean: (number | null)[]; temperature_2m_min: (number | null)[] };
};

export async function GET() {
  const today = todayKST();
  const lat = EMDS.map((e) => e.lat).join(",");
  const lon = EMDS.map((e) => e.lon).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_mean,temperature_2m_min&past_days=92&forecast_days=16&timezone=Asia%2FSeoul`;
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const json = (await res.json()) as OM | OM[];
    const list = Array.isArray(json) ? json : [json];
    const byEmd: Record<string, Day[]> = {};
    list.forEach((loc, i) => {
      const d = loc.daily;
      const days: Day[] = [];
      d.time.forEach((t, j) => {
        const m = d.temperature_2m_mean[j];
        const n = d.temperature_2m_min[j];
        if (m == null || n == null) return;
        days.push({ date: t, tmean: m, tmin: n, src: t < today ? "obs" : "fcst" });
      });
      byEmd[EMDS[i].name] = days;
    });
    return NextResponse.json({ today, fallback: false, source: "Open-Meteo 예보 API", byEmd });
  } catch (e) {
    const start = addDays(today, -92);
    const seed: Day[] = [{ date: start, tmean: 10, tmin: 4, src: "clim" }];
    const days = extendWithClimate(seed, addDays(today, 15));
    const byEmd = Object.fromEntries(EMDS.map((x) => [x.name, days]));
    return NextResponse.json({ today, fallback: true, error: String(e), source: "예년 평균 대체", byEmd });
  }
}
