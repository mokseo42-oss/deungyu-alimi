// 울주군 실내등유 가격 (오피넷 유가정보 API, 키는 OPINET_API_KEY)
// - 울주군 최저가 20곳(lowTop10.do, cnt=20) + 울주군 평균(avgSigunPrice.do)
// - 키가 없거나 실패하면 live=false. 화면은 저장된 2026-09-19 자료를 씀
import { NextResponse } from "next/server";

export const revalidate = 3600; // 1시간. 오피넷 일일 호출 한도 고려

const BASE = "https://www.opinet.co.kr/api";
const SIDO_ULSAN = "18";
const BRAND: Record<string, string> = {
  SKE: "SK에너지",
  GSC: "GS칼텍스",
  HDO: "HD현대오일뱅크",
  SOL: "S-OIL",
  RTE: "자영알뜰",
  RTX: "고속도로알뜰",
  NHO: "농협알뜰",
  ETC: "자가상표",
  E1G: "E1",
  SKG: "SK가스",
};
const RENAME: Record<string, string> = { 청량면: "청량읍", 삼남면: "삼남읍" };

type OilRes<T> = { RESULT?: { OIL?: T[] } };

async function opinet<T>(path: string, params: Record<string, string>) {
  const key = process.env.OPINET_API_KEY!;
  const q = new URLSearchParams({ out: "json", certkey: key, ...params });
  const res = await fetch(`${BASE}/${path}?${q}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`opinet ${path} ${res.status}`);
  const json = (await res.json()) as OilRes<T>;
  return json.RESULT?.OIL ?? [];
}

function emdOf(addr: string) {
  const m = addr.match(/울주군\s+(\S+?[읍면])(\s|$)/);
  if (!m) return "";
  return RENAME[m[1]] ?? m[1];
}

export async function GET() {
  if (!process.env.OPINET_API_KEY) return NextResponse.json({ live: false, reason: "OPINET_API_KEY 없음" });
  try {
    const areas = await opinet<{ AREA_CD: string; AREA_NM: string }>("areaCode.do", { area: SIDO_ULSAN });
    const ulju = areas.find((a) => a.AREA_NM.includes("울주"));
    if (!ulju) throw new Error("울주군 지역코드를 찾지 못함");
    const [low, avg] = await Promise.all([
      opinet<{ UNI_ID: string; PRICE: number | string; POLL_DIV_CD?: string; POLL_DIV_CO?: string; OS_NM: string; VAN_ADR?: string; NEW_ADR?: string }>(
        "lowTop10.do",
        { prodcd: "C004", area: ulju.AREA_CD, cnt: "20" },
      ),
      opinet<{ SIGUNCD: string; PRICE: number | string; DIFF: number | string }>("avgSigunPrice.do", {
        sido: SIDO_ULSAN,
        sigun: ulju.AREA_CD,
        prodcd: "C004",
      }),
    ]);
    const stations = low
      .map((o) => {
        const addr = o.NEW_ADR || o.VAN_ADR || "";
        const brand = o.POLL_DIV_CD ?? o.POLL_DIV_CO ?? "";
        return {
          id: o.UNI_ID,
          name: o.OS_NM,
          addr,
          brand: BRAND[brand] ?? brand,
          emd: emdOf(o.VAN_ADR || "") || emdOf(addr),
          kerosene: Number(o.PRICE),
        };
      })
      .filter((s) => s.kerosene > 0);
    const kst = new Date(Date.now() + 9 * 3600_000).toISOString();
    return NextResponse.json({
      live: true,
      asOf: `${kst.slice(0, 10)} ${kst.slice(11, 16)}`,
      areaCode: ulju.AREA_CD,
      average: avg[0] ? { price: Number(avg[0].PRICE), diff: Number(avg[0].DIFF) } : null,
      stations,
    });
  } catch (e) {
    return NextResponse.json({ live: false, reason: String(e).slice(0, 200) });
  }
}
