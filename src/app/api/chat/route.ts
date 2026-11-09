// AI 전화 "듣기": 어르신 말을 Gemini가 이해해 의도(JSON)로 돌려준다.
// - 주문·연결 같은 행동은 화면 쪽 단계 규칙이 정한다. LLM은 의도와 짧은 말만 만든다.
// - LLM 문장에 사실 목록에 없는 숫자가 들어 있으면 그 문장을 버린다(숫자 지어내기 방지).
// - 키가 없거나 실패하면 규칙 분류로 대체한다.
import { NextRequest, NextResponse } from "next/server";
import { ALLOWED, Facts, Intent, Understood, classify } from "@/lib/dialog";
import { GEMINI_MODEL, geminiJSON, hasGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ engine: hasGemini() ? "gemini" : "rule", model: hasGemini() ? GEMINI_MODEL : null });
}

// 아주 단순한 남용 방지(인스턴스별 분당 30회)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 30;
}

const STAGE_DESC: Record<string, string> = {
  gauge: "AI가 보일러 기름탱크 눈금이 지금 어디쯤인지 물었다.",
  offer: "AI가 단골 판매소 가격과 제안 주문량을 말하고 '주문해 드릴까요?'라고 물었다.",
  confirm: "AI가 주문 내용(양, 금액, 판매소)을 다시 말하고 최종 확인을 물었다.",
  checkin: "예상 소진일이 지났는데 주문이 없어 AI가 안부 겸 '보일러는 잘 돌리고 계세요?'라고 물었다.",
  money: "AI가 기름값 부담에 대해 생활지원사 연결을 원하는지 물었다.",
};

const INTENT_DESC = `의도 설명:
- gauge: 탱크 눈금을 말함. gauge_fraction에 탱크 대비 비율(0~1)을 넣는다. 눈금은 네 칸: 한 칸=0.25, 반/두 칸=0.5, 세 칸=0.75, 가득=0.95, 바닥/거의 없음=0.05. 리터로 말하면 gauge_liters에 넣는다. gauge_label에 어르신 표현을 짧게 요약(예: "네 칸 중 한 칸").
- plenty: 눈금은 말하지 않고 "많다/넉넉하다"고만 함.
- yes: 동의·승낙(응, 그래, 시켜 줘, 연결해 줘 등).
- no: 거절·보류(아니, 됐어, 나중에).
- amount: 주문은 원하지만 양을 바꿈. order_liters에 리터를 넣는다. "반만"=100, "한 드럼"=200.
- money: 기름값·돈 부담, 아껴 쓴다, 형편이 어렵다는 말. 다른 의도보다 우선한다.
- elsewhere: 다른 곳에서 이미 기름을 샀다/넣었다.
- away: 집을 비웠다(병원, 자녀 집 등).
- fine: 보일러를 잘 돌리고 있다, 따뜻하다.
- question: 배달 날짜, 가격, 남은 기름, 결제 방법 등 서비스에 대해 질문함. answer에 사실 목록만 근거로 답을 쓴다. 사실 목록에 없으면 "그건 제가 정확히 몰라서 판매소에서 확인 전화드릴 때 여쭤봐 주세요" 같은 식으로 답한다.
- unknown: 질문과 상관없는 말, 앞뒤가 맞지 않는 말, 알아듣기 어려운 말. 확실하지 않으면 unknown을 고른다.`;

const SYSTEM = `너는 울산 울주군 '등유 안심' 서비스의 AI 전화 상담원이다. 혼자 사는 어르신께 보일러 등유가 떨어지기 전에 전화한다.
너의 일은 어르신의 마지막 대답을 이해해 의도를 고르고, 필요하면 짧은 한국어 문장을 만드는 것이다.
규칙:
1. 반드시 허용된 의도 중 하나만 고른다.
2. say: 어르신 말에 대한 따뜻한 공감 한마디(20자 안팎, 존댓말, 숫자·날짜·금액 절대 금지, 약속 금지). 의도가 unknown이나 question이면 빈 문자열.
3. answer: question일 때만. 사실 목록에 있는 숫자·날짜·금액만 그대로 쓴다. 2문장 이내, 쉬운 말.
4. 돈, 카드 번호, 계좌, 개인정보를 묻는 말은 절대 만들지 않는다.
5. 사투리·구어체(경상도 말투 포함)를 이해한다. 예: "한 칸 남았나" = 한 칸 남은 것 같다.
${INTENT_DESC}`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    intent: {
      type: "STRING",
      enum: ["gauge", "plenty", "yes", "no", "amount", "money", "elsewhere", "away", "fine", "question", "unknown"],
    },
    gauge_fraction: { type: "NUMBER", nullable: true },
    gauge_liters: { type: "NUMBER", nullable: true },
    gauge_label: { type: "STRING", nullable: true },
    order_liters: { type: "NUMBER", nullable: true },
    say: { type: "STRING" },
    answer: { type: "STRING", nullable: true },
  },
  required: ["intent", "say"],
};

type Out = {
  intent: Intent["t"];
  gauge_fraction?: number | null;
  gauge_liters?: number | null;
  gauge_label?: string | null;
  order_liters?: number | null;
  say?: string;
  answer?: string | null;
};

// 문장 속 숫자가 모두 사실 목록에 있는지
function numbersOk(text: string, facts: Facts) {
  const blob = Object.values(facts).join(" ").replace(/,/g, "");
  const nums = text.replace(/,/g, "").match(/\d+(\.\d+)?/g) ?? [];
  return nums.every((n) => blob.includes(n));
}

function toIntent(o: Out, tank: number): Intent {
  switch (o.intent) {
    case "gauge": {
      let L = o.gauge_liters ?? (o.gauge_fraction != null ? o.gauge_fraction * tank : null);
      if (L == null || !isFinite(L)) return { t: "unknown" };
      L = Math.max(0, Math.min(tank, Math.round(L)));
      return { t: "gauge", liters: L, label: o.gauge_label?.slice(0, 20) || `${L}리터` };
    }
    case "amount": {
      const L = o.order_liters;
      if (L == null || !isFinite(L) || L <= 0) return { t: "yes" };
      return { t: "amount", liters: Math.max(20, Math.min(tank, Math.round(L / 10) * 10)) };
    }
    default:
      return { t: o.intent } as Intent;
  }
}

export async function POST(req: NextRequest) {
  let body: { text?: string; stage?: string; tank?: number; facts?: Facts; history?: { who: string; text: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const text = String(body.text ?? "").slice(0, 200);
  const stage = String(body.stage ?? "gauge");
  const tank = Math.max(50, Math.min(1000, Number(body.tank) || 200));
  const facts: Facts = Object.fromEntries(
    Object.entries(body.facts ?? {})
      .slice(0, 20)
      .map(([k, v]) => [String(k).slice(0, 30), typeof v === "number" ? v : String(v).slice(0, 80)]),
  );
  const history = (body.history ?? []).slice(-8).map((m) => `${m.who === "me" ? "어르신" : m.who === "ai" ? "AI" : "알림"}: ${String(m.text).slice(0, 200)}`);
  const allowed = ALLOWED[stage];
  if (!allowed) return NextResponse.json({ error: "bad stage" }, { status: 400 });

  const rule = (note: string): Understood => ({ intent: classify(text, tank, stage), source: "rule", note });
  if (!hasGemini()) return NextResponse.json(rule("GEMINI_API_KEY 없음 → 규칙 분류"));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json(rule("요청이 많아 규칙 분류"));

  const user = `현재 단계: ${stage} — ${STAGE_DESC[stage]}
허용된 의도: ${allowed.join(", ")}
탱크 크기: ${tank}리터
사실 목록(모델 계산값, 이 숫자만 쓸 수 있음):
${Object.entries(facts)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}
최근 대화:
${history.join("\n") || "(없음)"}
어르신의 마지막 대답: "${text}"`;

  try {
    const o = await geminiJSON<Out>(SYSTEM, user, SCHEMA);
    if (!allowed.includes(o.intent)) o.intent = "unknown";
    const intent = toIntent(o, tank);
    let say = (o.say ?? "").trim().slice(0, 60);
    if (/\d/.test(say) || intent.t === "unknown" || intent.t === "question") say = "";
    let answer = (o.answer ?? "").trim().slice(0, 200);
    if (intent.t === "question" && (!answer || !numbersOk(answer, facts))) {
      answer = "그건 제가 정확히 알지 못해요. 판매소에서 확인 전화드릴 때 여쭤봐 주세요.";
    }
    const out: Understood = { intent, say: say || undefined, answer: intent.t === "question" ? answer : undefined, source: "gemini" };
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(rule(`Gemini 실패 → 규칙 분류 (${String(e).slice(0, 120)})`));
  }
}
