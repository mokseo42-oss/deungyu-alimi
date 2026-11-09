// AI 전화 대화 (00 제안서 4장 "전화에서 나올 수 있는 답")
// 듣기(어르신 말 이해)는 Gemini가 맡는다(/api/chat). 키가 없거나 실패하면 아래 규칙 분류로 돌아간다.
// 숫자(잔량, 날짜, 가격)는 모델이 계산한 값만 쓰고, LLM이 만든 문장에 사실에 없는 숫자가 있으면 버린다.

export type Intent =
  | { t: "gauge"; liters: number; label: string }
  | { t: "plenty" }
  | { t: "yes" }
  | { t: "no" }
  | { t: "amount"; liters: number }
  | { t: "money" }
  | { t: "elsewhere" }
  | { t: "away" }
  | { t: "fine" }
  | { t: "question" }
  | { t: "unknown" };

export type Stage = "idle" | "gauge" | "offer" | "confirm" | "checkin" | "money" | "done";

// 단계마다 받을 수 있는 의도
export const ALLOWED: Record<string, Intent["t"][]> = {
  gauge: ["gauge", "plenty", "money", "question", "unknown"],
  offer: ["yes", "no", "amount", "money", "question", "unknown"],
  confirm: ["yes", "no", "question", "unknown"],
  checkin: ["fine", "gauge", "elsewhere", "away", "money", "question", "unknown"],
  money: ["yes", "no", "question", "unknown"],
};

// 질문에 답한 뒤 다시 묻는 말
export const REASK: Record<string, string> = {
  gauge: "그럼 탱크 눈금은 네 칸 중 몇 칸쯤 남았나요?",
  offer: "주문해 드릴까요?",
  confirm: "이대로 주문을 넣을까요?",
  checkin: "요즘 보일러는 잘 돌리고 계세요?",
  money: "생활지원사 선생님께 연결해 드릴까요?",
};

export type Understood = {
  intent: Intent;
  say?: string; // 어르신 말에 대한 짧은 공감 한마디(숫자 없음)
  answer?: string; // 어르신이 물어본 것에 대한 답(사실 목록의 숫자만)
  source: "gemini" | "rule";
  note?: string;
};

export type Facts = Record<string, string | number>;

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

export function classify(text: string, tank: number, stage = "gauge"): Intent {
  const s = text.trim();
  if (has(s, /돈|비싸|아껴|아끼|형편|부담|못 사|없어서/)) return { t: "money" };
  if (stage === "offer") {
    if (has(s, /반만|드럼 ?반/)) return { t: "amount", liters: 100 };
    const m = s.replace(/\s+/g, "").match(/(\d{2,3})(리터|L|l)/);
    if (m) return { t: "amount", liters: Math.min(tank, +m[1]) };
  }
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

// 브라우저에서 호출: Gemini로 이해하고, 실패하면 규칙으로
export async function understand(
  text: string,
  ctx: { stage: string; tank: number; facts: Facts; history: { who: string; text: string }[] },
): Promise<Understood> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, ...ctx }),
    });
    if (!res.ok) throw new Error(`chat ${res.status}`);
    return (await res.json()) as Understood;
  } catch (e) {
    return { intent: classify(text, ctx.tank, ctx.stage), source: "rule", note: String(e) };
  }
}

export const QUICK: Record<string, string[]> = {
  gauge: ["아래서 한 칸 남았나", "아직 많아", "세 칸쯤 있어", "바닥이야", "돈이 없어서 아껴 써"],
  offer: ["그래, 시켜 줘", "반만 넣어 줘", "아니, 됐어", "비싸서 부담돼", "언제 갖다줘?"],
  confirm: ["네", "아니요"],
  checkin: ["그럭저럭 잘 돌려", "아껴 쓰고 있어", "딴 데서 넣었어", "집을 비웠었어"],
  money: ["응, 연결해 줘", "아니, 괜찮아"],
};

export const CONFUSED_SAMPLE = "우리 손주가 언제 온다 했더라…";
