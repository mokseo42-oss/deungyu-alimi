// AI 전화 대화 규칙 (00 제안서 4장 "전화에서 나올 수 있는 답")
// 생성형 AI 자리는 "듣고 말하기"만 맡는다. 여기서는 규칙 기반으로 의도를 분류한다.
// 숫자(잔량, 날짜, 가격)는 모델이 계산한 값을 받아 문장에 끼워 넣기만 한다.

export type Intent =
  | { t: "gauge"; liters: number; label: string }
  | { t: "plenty" }
  | { t: "yes" }
  | { t: "no" }
  | { t: "half" }
  | { t: "money" }
  | { t: "elsewhere" }
  | { t: "away" }
  | { t: "fine" }
  | { t: "unknown" };

const has = (s: string, re: RegExp) => re.test(s.replace(/\s+/g, " "));

export function parseGauge(text: string, tank: number): Intent | null {
  const s = text.replace(/\s+/g, "");
  if (/바닥|거의없|다떨어|간당/.test(s)) return { t: "gauge", liters: Math.round(tank * 0.05), label: "바닥" };
  if (/(한|1)칸/.test(s)) return { t: "gauge", liters: tank / 4, label: "네 칸 중 한 칸" };
  if (/(두|2)칸|반/.test(s) && !/반만/.test(s)) return { t: "gauge", liters: tank / 2, label: "반" };
  if (/(세|3)칸/.test(s)) return { t: "gauge", liters: (tank * 3) / 4, label: "네 칸 중 세 칸" };
  if (/가득|꽉|(네|4)칸/.test(s)) return { t: "gauge", liters: tank * 0.95, label: "거의 가득" };
  const m = s.match(/(\d{2,3})(리터|L|l)/);
  if (m) return { t: "gauge", liters: Math.min(tank, +m[1]), label: `${m[1]}리터` };
  return null;
}

export function classify(text: string, tank: number): Intent {
  const s = text.trim();
  if (has(s, /돈|비싸|아껴|아끼|형편|부담|못 사|없어서/)) return { t: "money" };
  if (has(s, /반만|100 ?리터|드럼 반/)) return { t: "half" };
  const g = parseGauge(s, tank);
  if (g) return g;
  if (has(s, /딴 ?데|다른 ?데|따로 ?샀|넣었어|사 ?놨/)) return { t: "elsewhere" };
  if (has(s, /집을 ?비|집에 ?없|병원|아들 ?집|딸 ?집|자녀/)) return { t: "away" };
  if (has(s, /많아|넉넉|아직 ?있|충분/)) return { t: "plenty" };
  if (has(s, /아니|됐어|괜찮아|필요 ?없|나중에|안 ?해/)) return { t: "no" };
  if (has(s, /^(네|예|응|어|그래|좋아|그러지|맞아)|시켜|주문|넣어|해 ?줘|부탁|연결/)) return { t: "yes" };
  if (has(s, /잘 ?돌|따뜻|그럭저럭|괜찮게/)) return { t: "fine" };
  return { t: "unknown" };
}

export const QUICK: Record<string, string[]> = {
  gauge: ["아래서 한 칸 남았나", "아직 많아", "세 칸쯤 있어", "바닥이야", "돈이 없어서 아껴 써"],
  offer: ["그래, 시켜 줘", "반만 넣어 줘", "아니, 됐어", "비싸서 부담돼"],
  confirm: ["네", "아니요"],
  checkin: ["그럭저럭 잘 돌려", "아껴 쓰고 있어", "딴 데서 넣었어", "집을 비웠었어"],
  money: ["응, 연결해 줘", "아니, 괜찮아"],
};

export const CONFUSED_SAMPLE = "우리 손주가 언제 온다 했더라…";
