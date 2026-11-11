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
  confirm: ["yes", "no", "amount", "question", "unknown"],
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
  if (/바닥|거의없|다떨어|다썼|다됐|간당/.test(s)) return { t: "gauge", liters: Math.round(tank * 0.05), label: "바닥" };
  if (/(한|1)(칸|눈금)/.test(s)) return { t: "gauge", liters: tank / 4, label: "네 칸 중 한 칸" };
  if (/(두|2)(칸|눈금)|반/.test(s) && !/반만/.test(s)) return { t: "gauge", liters: tank / 2, label: "반" };
  if (/(세|3)(칸|눈금)/.test(s)) return { t: "gauge", liters: (tank * 3) / 4, label: "네 칸 중 세 칸" };
  if (/가득|꽉|(네|4)(칸|눈금)/.test(s)) return { t: "gauge", liters: tank * 0.95, label: "거의 가득" };
  const m = s.match(/(\d{2,3})(리터|L|l)/);
  if (m) return { t: "gauge", liters: Math.min(tank, +m[1]), label: `${m[1]}리터` };
  return null;
}

// 승낙이 곧 행동(주문, 생활지원사 연결)으로 이어지는 단계
const ACTION_STAGES = ["confirm", "money"];

const MAL: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 };

// 주문량: "반 드럼"(100), "한 드럼"(200), "다섯 말"(한 말 = 20리터), "100리터"
function parseAmount(text: string, tank: number): number | null {
  const s = text.replace(/\s+/g, "");
  if (/반만|반드럼|드럼반/.test(s)) return 100;
  if (/(한|1)드럼/.test(s)) return Math.min(tank, 200);
  // '말'은 양을 세는 말일 때만("한 말씀", "네 말이 맞다"는 아니다)
  const mal = s.match(/(\d{1,2}|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)말(만|쯤|정도|이나|넣|시켜|주|$)/);
  if (mal) return Math.min(tank, (MAL[mal[1]] ?? +mal[1]) * 20);
  const m = s.match(/(\d{2,3})(리터|L|l)/);
  return m ? Math.min(tank, +m[1]) : null;
}

// 문장 전체가 승낙인가. 낱말을 하나씩 보고, 모르는 낱말이 하나라도 있으면 승낙으로 읽지 않는다.
const YES_WORD = /^((네|예|응)+|그래|그럼요|맞아|맞다|맞습니다|맞심더|좋아|좋다|좋습니다|오야|오냐|그러지|그럽시다)요?$/;
const DO_WORD = /^(주문해|시켜|시키소|넣어|넣으소|연결해|해|하소|하이소|합시다|줘|주세요|주소|주이소|주라|부탁해|부탁합니다|부탁드려요)요?$/;
const FILL_WORD = /^(어|아|음|그럼|그라모|그러면|그렇게|그리|이대로|그대로|좀|주문|연결|기름)$/;

function clearYes(text: string) {
  if (text.includes("?")) return false;
  const words = text.replace(/[.,!~…]/g, " ").trim().split(/\s+/);
  const strong = (w: string) => YES_WORD.test(w) || DO_WORD.test(w);
  return words.every((w) => strong(w) || FILL_WORD.test(w)) && words.some(strong);
}

export function classify(text: string, tank: number, stage = "gauge"): Intent {
  const s = text.trim();
  if (has(s, /돈|비싸|아껴|아끼|형편|부담|못 사|없어서/)) return { t: "money" };
  // 확인 단계에서 양을 바꾸는 말도 승낙이 아니다(화면이 바뀐 양으로 다시 묻는다)
  if (stage === "offer" || stage === "confirm") {
    const liters = parseAmount(s, tank);
    if (liters) return { t: "amount", liters };
  }
  // "반", "가득"은 눈금을 물었을 때만 눈금이다
  if (stage === "gauge" || stage === "checkin") {
    const g = parseGauge(s, tank);
    if (g) return g;
  }
  if (has(s, /딴 ?데|다른 ?데|따로 ?샀|넣었어|사 ?놨/)) return { t: "elsewhere" };
  if (has(s, /집을 ?비|집에 ?없|병원|아들 ?집|딸 ?집|자녀/)) return { t: "away" };
  if (has(s, /많아|넉넉|아직 ?있|충분/)) return { t: "plenty" };
  if (has(s, /아니|됐어|괜찮아|필요 ?없|나중에|다음에|안 ?해|아이다|아입니|됐다|됐심더|치아라/)) return { t: "no" };
  // 첫마디 "네/응/어"가 다른 낱말의 앞부분("네가", "어떡하지")이거나 되묻는 말("네?")이면 승낙이 아니다.
  // 승낙 낱말이 있어도 부정이 붙으면 거절이다("주문하지 마", "안 할래", "취소해").
  const yesHead = has(s, /^(네|예|응|어|그래|좋아|그러지|맞아|오야|오냐)+($|[\s,.!~]|요)/);
  const yesish = yesHead || has(s, /시켜|시키|주문|넣어|해 ?(줘|주)|부탁|연결|채워|주이소|하이소|하소/);
  if (yesish && has(s, /지 ?마|지 ?말|않|안 ?(해|할|하|시|넣|사)|그만|취소|싫/)) return { t: "no" };
  // 승낙이 곧 행동인 단계는 문장 전체가 승낙일 때만 승낙으로 읽는다("어 잠깐만, 누구라고?"는 주문이 아니다)
  if (ACTION_STAGES.includes(stage) ? clearYes(s) : yesish) return { t: "yes" };
  if (has(s, /잘 ?돌|따뜻|그럭저럭|괜찮게/)) return { t: "fine" };
  return { t: "unknown" };
}

// Gemini가 승낙이라고 해도, 승낙이 곧 행동인 단계에서 되묻거나 망설이는 말이면 다시 묻게 한다
export function safeIntent(intent: Intent, text: string, stage: string): Intent {
  const doubt = /\?|누구|뭐|뭔|얼마|얼만|언제|어디|왜|잠깐|다음에|나중에|생각|물어|말고|글쎄|모르/;
  return intent.t === "yes" && ACTION_STAGES.includes(stage) && doubt.test(text) ? { t: "unknown" } : intent;
}

// 문장 속 숫자가 모두 사실 목록에 있는 숫자와 같은지. 일부만 겹치는 숫자("1,560" 속의 5, 15, 60)는 통과시키지 않는다
export function numbersOk(text: string, facts: Facts) {
  const nums = (t: string) => t.replace(/,/g, "").match(/\d+(\.\d+)?/g) ?? [];
  const known = new Set(nums(Object.values(facts).join(" ")));
  return nums(text).every((n) => known.has(n));
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
