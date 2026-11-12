// AI 전화 대화 (00 제안서 4장 "전화에서 나올 수 있는 답")
// 듣기(어르신 말 이해): 분명한 말은 아래 낱말 규칙이 바로 읽고, 모르는 말·질문·긴 말만 Gemini에 보낸다(/api/chat).
// Gemini 키가 없거나 실패하면 낱말 규칙의 답을 그대로 쓴다.
// 숫자(잔량, 날짜, 가격)는 모델이 계산한 값만 쓰고, LLM이 만든 문장에 사실에 없는 숫자가 있으면 버린다.

export type Intent =
  | { t: "gauge"; liters: number; label: string }
  | { t: "plenty" }
  | { t: "yes" }
  | { t: "no" }
  | { t: "amount"; liters: number }
  | { t: "money" }
  | { t: "elsewhere"; liters?: number } // 다른 데서 넣음. 양을 같이 말했으면 liters
  | { t: "away" }
  | { t: "fine" }
  | { t: "unsure" } // 모르겠다, 눈금을 못 본다
  | { t: "order" } // 먼저 건 전화에서 기름을 시켜 달라고 함(양은 말하지 않음)
  | { t: "emergency" } // 몸이 아프다
  | { t: "boiler" } // 보일러가 켜지지 않는다
  | { t: "human" } // 사람과 통화하고 싶다
  | { t: "distrust" } // 전화를 믿지 못하겠다
  | { t: "question" }
  | { t: "unknown" };

// ask: 어르신이 먼저 걸어 와 무엇을 도울지 물은 단계, since: 다른 데서 넣은 적이 있는지, bought: 얼마나 넣었는지
export type Stage = "idle" | "ask" | "since" | "bought" | "gauge" | "offer" | "confirm" | "checkin" | "money" | "done";

// 어느 단계에서든 받는 말. 주문 대화를 멈추고 화면이 정해진 안내를 한다
export const URGENT: Intent["t"][] = ["emergency", "boiler", "human", "distrust"];

// 단계마다 받을 수 있는 의도(여기에 URGENT가 더해진다)
const BY_STAGE: Record<string, Intent["t"][]> = {
  ask: ["order", "amount", "elsewhere", "gauge", "money", "no", "question", "unknown"],
  since: ["no", "yes", "elsewhere", "plenty", "gauge", "unsure", "money", "question", "unknown"],
  bought: ["amount", "unsure", "question", "unknown"],
  gauge: ["gauge", "plenty", "unsure", "money", "question", "unknown"],
  offer: ["yes", "no", "amount", "money", "question", "unknown"],
  confirm: ["yes", "no", "amount", "question", "unknown"],
  checkin: ["fine", "gauge", "elsewhere", "away", "money", "question", "unknown"],
  money: ["yes", "no", "question", "unknown"],
};
export const ALLOWED: Record<string, Intent["t"][]> = Object.fromEntries(
  Object.entries(BY_STAGE).map(([stage, list]) => [stage, [...list, ...URGENT]]),
);

// 질문에 답한 뒤 다시 묻는 말
export const REASK: Record<string, string> = {
  ask: "더 도와드릴 일이 있으세요?",
  since: "지난번 배달 뒤에 다른 데서 기름 넣으신 적 있으세요?",
  bought: "얼마나 넣으셨어요?",
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
  direct?: boolean; // 분명한 말이라 Gemini에 묻지 않고 낱말 규칙이 바로 읽었다
  note?: string;
};

export type Facts = Record<string, string | number>;

const has = (s: string, re: RegExp) => re.test(s.replace(/\s+/g, " "));

export function parseGauge(text: string, tank: number): Intent | null {
  const s = text.replace(/\s+/g, "");
  if (/바닥|거의없|기름이?없|다떨어|다썼|다됐|간당/.test(s)) return { t: "gauge", liters: Math.round(tank * 0.05), label: "바닥" };
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

// 승낙 낱말이 있어도 이 말이 붙으면 승낙이 아니다("주문하지 마", "안 할래", "취소해")
const NEGATED = /지 ?마|지 ?말|않|안 ?(해|할|하|시|넣|사)|그만|취소|싫/;

// 급한 말과 사람을 찾는 말. 어느 단계에서든 낱말 규칙이 바로 읽는다(Gemini를 기다리지 않는다)
export function urgentIntent(text: string): Intent | null {
  const s = text.replace(/\s+/g, " ");
  const hurts = /아파(?!트)|아프/.test(s) && !/안 ?아[파프]|아프지 ?않/.test(s); // '아파트'는 아니다
  if (hurts || /몸이 ?안 ?좋|쓰러|어지러|숨이 ?(차|막|안)|가슴이|살려|119/.test(s)) return { t: "emergency" };
  if (/보일러.*(안 ?켜[져지]|안 ?돌아|안 ?[돼되]|고장|꺼졌|꺼져)|불이 ?안 ?(들어|붙)/.test(s)) return { t: "boiler" };
  if (/사람.{0,6}(얘기|이야기|통화|바꿔|불러|연결)|상담원/.test(s)) return { t: "human" };
  // '사기'는 속인다는 뜻일 때만("기름 사기 힘들어"는 아니다)
  if (/못 ?믿|보이스 ?피싱|피싱|수상|의심|사기 ?(꾼|치|전화|아니|아이|지|야|인|같)/.test(s)) return { t: "distrust" };
  return null;
}

export function classify(text: string, tank: number, stage = "gauge"): Intent {
  const s = text.trim();
  const urgent = urgentIntent(s);
  if (urgent) return urgent;
  if (has(s, /돈|비싸|아껴|아끼|형편|부담|못 사|없어서|값이 ?(없|모자|부족)/)) return { t: "money" };
  // 확인 단계에서 양을 바꾸는 말도 승낙이 아니다(화면이 바뀐 양으로 다시 묻는다)
  if (stage === "offer" || stage === "confirm" || stage === "bought") {
    const liters = parseAmount(s, tank);
    if (liters) return { t: "amount", liters };
  }
  // "다른 데서 넣으신 적 있으세요?"의 답. "안 넣었어"에도 "넣었어"가 들어 있으니 없다는 말을 먼저 본다
  if (stage === "since" && has(s, /없어|없다|없지|없심더|없는데|안 ?넣|안 ?샀/)) return { t: "no" };
  // "다른 데는 얼마야?" 같은 질문은 다른 데서 샀다는 말이 아니다
  if (!isQuestion(s) && has(s, /딴 ?데|다른 ?데|따로 ?샀|넣었어|넣었다|사 ?놨/)) {
    const liters = parseAmount(s, tank);
    return liters ? { t: "elsewhere", liters } : { t: "elsewhere" };
  }
  // 먼저 건 전화. "한 드럼 넣었어"(다른 데서 넣음)는 위에서 걸렀으니, 여기 남은 양은 주문량이다
  if (stage === "ask") {
    const liters = parseAmount(s, tank);
    if (liters) return { t: "amount", liters };
    // "주문 안 해", "주문 취소해 줘"는 주문도 거절도 아니다(취소는 화면이 따로 안내한다)
    if (!isQuestion(s) && has(s, /시켜|시키|주문|넣어 ?(줘|주|도)|갖다 ?(줘|주|도)|배달|채워/)) {
      return has(s, NEGATED) ? { t: "unknown" } : { t: "order" };
    }
    // "더 도와드릴 일이 있으세요?"의 답. "기름이 없어"는 여기 해당하지 않는다
    if (/^(아니[요오]?,? ?)?(이제 ?|더 ?)?(없어요?|없다|없심더|없습니다)[.!]?$/.test(s)) return { t: "no" };
  }
  // "반", "가득"은 눈금을 물었거나 물을 수 있는 단계에서만 눈금이다
  if (stage === "gauge" || stage === "checkin" || stage === "since" || stage === "ask") {
    const g = parseGauge(s, tank);
    if (g) return g;
  }
  if ((stage === "since" || stage === "bought" || stage === "gauge") && has(s, /모르|못 ?봐|못 ?보|안 ?보여|밖에 ?있|기억 ?안/)) {
    return { t: "unsure" };
  }
  if (has(s, /집을 ?비|집에 ?없|병원|아들 ?집|딸 ?집|자녀/)) return { t: "away" };
  if (has(s, /많아|넉넉|아직 ?있|충분/)) return { t: "plenty" };
  if (has(s, /아니|됐어|괜찮아|필요 ?없|나중에|다음에|안 ?해|아이다|아입니|됐다|됐심더|치아라/)) return { t: "no" };
  // 첫마디 "네/응/어"가 다른 낱말의 앞부분("네가", "어떡하지")이거나 되묻는 말("네?")이면 승낙이 아니다.
  // 승낙 낱말이 있어도 부정이 붙으면 거절이다("주문하지 마", "안 할래", "취소해").
  const yesHead = has(s, /^(네|예|응|어|그래|좋아|그러지|맞아|오야|오냐)+($|[\s,.!~]|요)/);
  const yesish = yesHead || has(s, /시켜|시키|주문|넣어|해 ?(줘|주)|부탁|연결|채워|주이소|하이소|하소/);
  if (yesish && has(s, NEGATED)) return { t: "no" };
  // 승낙이 곧 행동인 단계는 문장 전체가 승낙일 때만 승낙으로 읽는다("어 잠깐만, 누구라고?"는 주문이 아니다)
  if (ACTION_STAGES.includes(stage) ? clearYes(s) : yesish) return { t: "yes" };
  if (has(s, /잘 ?돌|따뜻|그럭저럭|괜찮게/)) return { t: "fine" };
  return { t: "unknown" };
}

// 묻는 말인가. 질문은 낱말만 보고 뜻을 정하지 않는다("돈은 어떻게 내?"는 돈 부담이 아니다)
export const isQuestion = (text: string) => /\?|언제|얼마|어떻게|어디|왜|누구|뭐|뭔|몇/.test(text);

// 낱말 규칙의 답만으로 충분한가. 모르는 말, 질문, 긴 말은 Gemini에 보낸다
export function ruleIsEnough(text: string, intent: Intent) {
  if (URGENT.includes(intent.t)) return true; // 급한 말은 길거나 묻는 꼴이어도 기다리지 않는다
  return intent.t !== "unknown" && !isQuestion(text) && text.trim().split(/\s+/).length <= 4;
}

// 자주 나오는 질문의 종류. Gemini가 답하지 못할 때 화면이 사실 목록의 값으로 바로 답하는 데 쓴다
export function faqTopic(text: string): "pay" | "delivery" | "cheaper" | "who" | "level" | "price" | null {
  const s = text.replace(/\s+/g, " ");
  if (/(값|돈|기름값)[은는이가]? ?(언제|어떻게|뭐로).*(내|줘|결제|계산)|결제|카드로/.test(s)) return "pay";
  if (/(언제|며칠).*(갖다|배달|와|걸려)|배달.*(언제|며칠)/.test(s)) return "delivery";
  if (/(다른|딴) ?(데|곳).*(얼마|싸|싼)|더 ?싼|싼 ?(데|곳)/.test(s)) return "cheaper";
  if (/어디서.*(전화|연락)|누구/.test(s)) return "who";
  if (/(기름|탱크).*(얼마|몇).*(남|있)|(얼마나?|몇 ?(리터|칸)).*남|언제.*(떨어|바닥)/.test(s)) return "level";
  if (/얼마(야|예요|에요|고|요|니|인데|지)|얼만데|얼만가|(가격|값).*(얼마|알려)/.test(s)) return "price";
  return null;
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

// 화면의 빠른 답 버튼. 물음표로 끝나는 질문은 낱말 규칙이 읽지 못해 Gemini가 답한다
export const QUICK: Record<string, string[]> = {
  ask: ["기름 시켜 줘", "반 드럼만 시켜 줘", "기름 얼마나 남았어?", "오늘 등유 얼마야?", "어제 딴 데서 넣었어", "기름값이 없어", "보일러가 안 켜져", "몸이 안 좋아", "사람이랑 얘기할래"],
  since: ["아니, 없어", "지난주에 딴 데서 넣었어", "아직 많아", "돈이 없어서 아껴 써", "어디서 전화하는 거요?"],
  bought: ["반 드럼", "한 드럼", "모르겠어"],
  gauge: ["아래서 한 칸 남았나", "세 칸쯤 있어", "바닥이야", "밖에 있어서 못 봐"],
  offer: ["그래, 시켜 줘", "한 드럼으로 넣어 줘", "아니, 됐어", "비싸서 부담돼", "언제 갖다줘?", "다른 데는 얼마야?"],
  confirm: ["네", "아니요", "값은 언제 내?"],
  checkin: ["그럭저럭 잘 돌려", "아껴 쓰고 있어", "딴 데서 넣었어", "집을 비웠었어"],
  money: ["응, 연결해 줘", "아니, 괜찮아"],
};

export const CONFUSED_SAMPLE = "우리 손주가 언제 온다 했더라…";
