// 울주군 읍면 기초 자료
// - 65세 이상 인구: 공공데이터포털 '울산광역시 울주군_노인인구 현황'(15102401), 2025-08-20 기준 파일
// - 읍면 중심 좌표: 개략값(지도 개략도용). 정확한 경계가 아님
// - 우선순위: 03 기획안 2절

export type Emd = {
  name: string;
  kind: "읍" | "면";
  lat: number;
  lon: number;
  elderly: number; // 65세 이상
  age75: number; // 75세 이상
  age80: number; // 80세 이상
  priority: 1 | 2 | 0; // 1=1순위, 2=2순위, 0=대상 아님(도시가스 위주)
};

export const EMDS: Emd[] = [
  { name: "범서읍", kind: "읍", lat: 35.575, lon: 129.24, elderly: 9194, age75: 3049, age80: 1674, priority: 0 },
  { name: "온산읍", kind: "읍", lat: 35.43, lon: 129.32, elderly: 3485, age75: 1223, age80: 674, priority: 0 },
  { name: "언양읍", kind: "읍", lat: 35.57, lon: 129.135, elderly: 6008, age75: 2163, age80: 1209, priority: 0 },
  { name: "온양읍", kind: "읍", lat: 35.415, lon: 129.27, elderly: 4855, age75: 1790, age80: 1036, priority: 0 },
  { name: "청량읍", kind: "읍", lat: 35.49, lon: 129.29, elderly: 3798, age75: 1297, age80: 718, priority: 0 },
  { name: "삼남읍", kind: "읍", lat: 35.525, lon: 129.1, elderly: 5070, age75: 1767, age80: 995, priority: 0 },
  { name: "서생면", kind: "면", lat: 35.36, lon: 129.32, elderly: 2619, age75: 1024, age80: 572, priority: 2 },
  { name: "웅촌면", kind: "면", lat: 35.46, lon: 129.21, elderly: 2700, age75: 1074, age80: 628, priority: 2 },
  { name: "두동면", kind: "면", lat: 35.64, lon: 129.19, elderly: 1785, age75: 704, age80: 437, priority: 1 },
  { name: "두서면", kind: "면", lat: 35.66, lon: 129.1, elderly: 1524, age75: 675, age80: 414, priority: 1 },
  { name: "상북면", kind: "면", lat: 35.59, lon: 129.05, elderly: 3058, age75: 1187, age80: 695, priority: 1 },
  { name: "삼동면", kind: "면", lat: 35.515, lon: 129.16, elderly: 847, age75: 363, age80: 227, priority: 1 },
];

// 서부 산간 두 곳은 기사 값(울산신문 2026-10-06, 2026년 8월 기준)
export const ELDERLY_SHARE_NOTE: Record<string, string> = {
  두서면: "읍면 인구 중 65세 이상 54.8%",
  삼동면: "읍면 인구 중 65세 이상 52.4%",
};

// 울주 겨울 월별 난방도일 평균(개략). 2023~26 세 겨울 ERA5 계산(분석/04)에서 반올림
// 예보가 끝난 뒤 남은 기간을 채울 때만 씀
export const MONTHLY_HDD: Record<number, number> = {
  1: 550, 2: 430, 3: 300, 4: 160, 5: 50, 6: 5, 7: 0, 8: 0, 9: 15, 10: 110, 11: 300, 12: 480,
};

export const VOUCHER = {
  base1p: 295200, // 2026 바우처 1인 가구(보도, 공식 문서 미확인)
  keroseneExtra: 147000, // 등유·LPG 추가지원(보도)
};
