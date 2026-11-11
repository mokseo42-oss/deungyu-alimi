// 울주군 12개 읍면의 지난 92일 + 앞으로 16일 일평균·최저기온 (Open-Meteo, 키 없음)
// 실패하면 월별 평년값으로 대체하고 fallback=true를 돌려준다.
import { NextResponse, connection } from "next/server";
import { EMDS } from "@/data/ulju";
import { Day, extendWithClimate, todayKST, addDays } from "@/lib/model";

const REVALIDATE = 10800; // 기온 자료를 저장해 두는 시간(3시간)

type OM = {
  daily: { time: string[]; temperature_2m_mean: (number | null)[]; temperature_2m_min: (number | null)[] };
};

async function load(url: string, fresh = false) {
  const res = await fetch(url, fresh ? { cache: "no-store" } : { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = (await res.json()) as OM | OM[];
  return Array.isArray(json) ? json : [json];
}

export async function GET() {
  // 응답은 요청마다 새로 만들고 기온 자료만 저장해 둔다. 응답에 '오늘' 날짜가 들어가기 때문이다.
  // 전에는 응답 전체를 저장해서, 한동안 아무도 열지 않은 뒤의 첫 방문자는 며칠 전 '오늘'로 계산된 화면을 볼 수 있었다
  await connection();
  const today = todayKST();
  const lat = EMDS.map((e) => e.lat).join(",");
  const lon = EMDS.map((e) => e.lon).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_mean,temperature_2m_min&past_days=92&forecast_days=16&timezone=Asia%2FSeoul`;
  try {
    let list = await load(url);
    // 저장해 둔 자료가 오래돼 오늘 날짜가 들어 있지 않으면 새로 받는다
    if (!list[0]?.daily.time.includes(today)) list = await load(url, true);
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
    return NextResponse.json({ today, fallback: true, error: String(e), source: "평년값 대체", byEmd });
  }
}
