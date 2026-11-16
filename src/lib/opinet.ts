// 서버 전용: 오피넷 유가정보 API로 울주군·전국 실내등유(C004) 가격을 가져온다(키는 OPINET_API_KEY).
// /api/prices(화면)와 /api/ask(챗봇)가 함께 쓴다. 1시간 동안 저장해 오피넷 하루 호출 한도를 아낀다.

const BASE = "https://www.opinet.co.kr/api";
const SIDO_ULSAN = "18";
const REVALIDATE = 3600;
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
const RENAME: Record<string, string> = { 청량면: "청량읍", 삼남면: "삼남읍", 범서면: "범서읍" };

type OilRes<T> = { RESULT?: { OIL?: T[] } };

async function opinet<T>(path: string, params: Record<string, string>) {
  const q = new URLSearchParams({ out: "json", certkey: process.env.OPINET_API_KEY ?? "", ...params });
  const res = await fetch(`${BASE}/${path}?${q}`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`opinet ${path} ${res.status}`);
  const json = (await res.json()) as OilRes<T>;
  return json.RESULT?.OIL ?? [];
}

function emdOf(addr: string) {
  const m = addr.match(/울주군\s+(\S+?[읍면])(\s|$)/);
  if (!m) return "";
  return RENAME[m[1]] ?? m[1];
}

export type LiveStation = { id: string; name: string; addr: string; brand: string; emd: string; kerosene: number };

export type KeroseneLive =
  | {
      live: true;
      asOf: string;
      areaCode: string;
      average: { price: number; diff: number } | null; // 울주군 평균, 어제 대비
      national: { price: number; diff: number } | null; // 전국 평균, 어제 대비
      stations: LiveStation[]; // 울주군 최저가 20곳
    }
  | { live: false; reason: string };

export async function getKerosene(): Promise<KeroseneLive> {
  if (!process.env.OPINET_API_KEY) return { live: false, reason: "OPINET_API_KEY 없음" };
  try {
    const areas = await opinet<{ AREA_CD: string; AREA_NM: string }>("areaCode.do", { area: SIDO_ULSAN });
    const ulju = areas.find((a) => a.AREA_NM.includes("울주"));
    if (!ulju) throw new Error("울주군 지역코드를 찾지 못함");
    type Low = { UNI_ID: string; PRICE: number | string; POLL_DIV_CD?: string; POLL_DIV_CO?: string; OS_NM: string; VAN_ADR?: string; NEW_ADR?: string };
    type Avg = { PRODCD?: string; PRICE: number | string; DIFF: number | string };
    const [low, avg, all] = await Promise.all([
      opinet<Low>("lowTop10.do", { prodcd: "C004", area: ulju.AREA_CD, cnt: "20" }),
      opinet<Avg>("avgSigunPrice.do", { sido: SIDO_ULSAN, sigun: ulju.AREA_CD, prodcd: "C004" }),
      opinet<Avg>("avgAllPrice.do", {}).catch(() => [] as Avg[]),
    ]);
    const stations = low
      .map((o) => {
        const addr = o.NEW_ADR || o.VAN_ADR || "";
        const brand = o.POLL_DIV_CD ?? o.POLL_DIV_CO ?? "";
        return { id: o.UNI_ID, name: o.OS_NM, addr, brand: BRAND[brand] ?? brand, emd: emdOf(o.VAN_ADR || "") || emdOf(addr), kerosene: Number(o.PRICE) };
      })
      .filter((s) => s.kerosene > 0);
    const nat = all.find((x) => x.PRODCD === "C004");
    const kst = new Date(Date.now() + 9 * 3600_000).toISOString();
    return {
      live: true,
      asOf: `${kst.slice(0, 10)} ${kst.slice(11, 16)}`,
      areaCode: ulju.AREA_CD,
      average: avg[0] ? { price: Number(avg[0].PRICE), diff: Number(avg[0].DIFF) } : null,
      national: nat ? { price: Number(nat.PRICE), diff: Number(nat.DIFF) } : null,
      stations,
    };
  } catch (e) {
    return { live: false, reason: String(e).slice(0, 200) };
  }
}
