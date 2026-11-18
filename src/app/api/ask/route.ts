// 등유 챗봇: 질문 → 질문 종류 → 사실 목록(오피넷 조회 + 브라우저가 보낸 우리 집 계산값) → Gemini가 사실만으로 답을 씀
// → 답 속 숫자를 사실 목록과 대조. 맞지 않으면 한 번 다시 쓰게 하고, 그래도 다르면 정해 둔 답을 보낸다(기름알리미와 같은 방식).
import { NextRequest, NextResponse } from "next/server";
import data from "@/data/stations.json";
import { HouseFacts, PriceFacts, Topic, countNumbers, emdIn, factsFor, parsePriceRule, templateAnswer, topicOf } from "@/lib/ask";
import { numbersOk } from "@/lib/dialog";
import { geminiJSON, hasGemini } from "@/lib/gemini";
import { getKerosene } from "@/lib/opinet";

export const dynamic = "force-dynamic";

// 남용 방지: 기름알리미와 같은 기준(한 사람당 10분에 15회)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 15;
}

async function priceFacts(emd: string): Promise<PriceFacts> {
  const live = await getKerosene();
  type S = { name: string; emd: string; kerosene: number };
  const stored = data.stations as S[];
  const list: S[] = live.live ? live.stations : stored;
  const sorted = [...list].sort((a, b) => a.kerosene - b.kerosene);
  const here = sorted.find((s) => s.emd === emd) ?? (live.live ? stored.filter((s) => s.emd === emd).sort((a, b) => a.kerosene - b.kerosene)[0] : undefined);
  return {
    live: live.live,
    asOf: live.live ? live.asOf : data.asOf,
    ujuAvg: live.live ? (live.average?.price ?? null) : Math.round((stored.reduce((a, s) => a + s.kerosene, 0) / stored.length) * 10) / 10,
    ujuDiff: live.live ? (live.average?.diff ?? null) : null,
    natAvg: live.live ? (live.national?.price ?? null) : null,
    natDiff: live.live ? (live.national?.diff ?? null) : null,
    emd,
    emdCheapest: here ? { name: here.name, price: here.kerosene } : null,
    ujuCheapest: sorted[0] ? { name: sorted[0].name, emd: sorted[0].emd, price: sorted[0].kerosene } : null,
  };
}

const SYSTEM = `너는 '등유 알리미'의 안내 챗봇이다. 등유 보일러를 쓰는 어르신과 가족, 생활지원사의 질문에 답한다.
너에게는 질문, 사실 목록, 그리고 사실 목록으로 만든 '초안 답'이 주어진다.
할 일: 초안 답을 질문에 딱 맞게, 따뜻하고 쉬운 존댓말("~해요")로 다듬는다.
규칙:
1. 초안 답의 사실과 숫자를 빠뜨리거나 바꾸지 않는다. 숫자·날짜·금액은 초안 답이나 사실 목록에 있는 것을 그대로 옮긴다. 새로 계산하지 않는다.
2. 초안 답에 없는 내용을 덧붙이지 않는다. 특히 판매소(○○상회) 가격에는 '주유소 가격이라 배달 확인' 같은 말을 붙이지 않는다.
3. 3~5문장으로 짧게. 어르신이 들어도 알아듣게.
4. 초안 답이 이미 질문에 답하고 있으면 거절하지 않는다. 초안 답이 '답하기 어렵다'고 하면 그 뜻을 그대로 살린다.
5. 돈, 카드 번호, 계좌, 개인정보는 묻지 않는다. 앞으로의 가격은 예측하지 않는다.`;

const SCHEMA = { type: "OBJECT", properties: { answer: { type: "STRING" } }, required: ["answer"] };

export type AskReply = {
  answer: string;
  topic: Topic;
  numbers: number; // 답 속 숫자 개수
  verified: boolean; // 숫자를 사실 목록과 대조해 일치
  source: "gemini" | "rule";
  note?: string;
  rule?: { price: number; emd: string }; // 가격 알림 조건 제안(화면에서 저장을 눌러야 저장)
  asOf: string;
};

export async function POST(req: NextRequest) {
  let body: { question?: string; emd?: string; house?: HouseFacts | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const q = String(body.question ?? "").slice(0, 300).trim();
  if (!q) return NextResponse.json({ error: "empty" }, { status: 400 });
  // 질문에 읍면 이름이 있으면("두서면 제일 싼 곳") 아래 선택칸보다 그걸 먼저 쓴다
  const emd = emdIn(q) ?? String(body.emd ?? "두서면").slice(0, 10);
  const house = body.house ?? null;

  const topic = topicOf(q);
  const p = await priceFacts(emd);
  const facts = factsFor(topic, p, house, q);
  const price = parsePriceRule(q);
  const base = { topic, asOf: p.asOf, ...(price ? { rule: { price, emd } } : {}) };
  // 사실 목록 + 질문 속 숫자(이용자가 말한 1,500원 같은 값)는 답에 다시 써도 된다
  // 항목 이름 속 숫자("반 드럼(100L) 값", "앞으로 7일 쓸 양")도 함께 대조한다
  const allowed: Record<string, string> = { 질문: q, ...Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, `${k} ${v}`])) };

  const rule = (note: string): AskReply => {
    const answer = templateAnswer(topic, p, house, q);
    return { ...base, answer, numbers: countNumbers(answer), verified: numbersOk(answer, allowed), source: "rule", note };
  };
  // 알림 조건은 말을 지어낼 필요가 없어 정해 둔 답을 쓴다
  if (topic === "alert" || !hasGemini()) return NextResponse.json(rule(hasGemini() ? "알림 조건" : "GEMINI_API_KEY 없음"));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json(rule("질문이 많아 정해 둔 답"));

  const draft = templateAnswer(topic, p, house, q);
  const user = `질문: "${q}"
질문 종류: ${topic}
초안 답: ${draft}
사실 목록:
${Object.entries(facts)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}`;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const o = await geminiJSON<{ answer: string }>(
        SYSTEM,
        attempt ? `${user}\n\n주의: 앞의 답에 사실 목록에 없는 숫자가 있었다. 목록의 숫자만 그대로 옮겨 다시 써라.` : user,
        SCHEMA,
        8000,
      );
      const answer = (o.answer ?? "").trim().slice(0, 700);
      if (answer && numbersOk(answer, allowed)) {
        return NextResponse.json({ ...base, answer, numbers: countNumbers(answer), verified: true, source: "gemini" } satisfies AskReply);
      }
    }
    return NextResponse.json(rule("Gemini 답의 숫자가 사실과 달라 정해 둔 답"));
  } catch (e) {
    return NextResponse.json(rule(`Gemini 실패 → 정해 둔 답 (${String(e).slice(0, 100)})`));
  }
}
