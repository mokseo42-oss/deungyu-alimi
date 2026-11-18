// 등유 챗봇 시험: 질문 종류 가르기, 가격 알림 조건 읽기, 정해 둔 답의 숫자가 사실 목록과 맞는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
const { josa, topicOf, parsePriceRule, parseWon, emdIn, factsFor, templateAnswer, SUGGEST, countNumbers } = await import("../src/lib/ask.ts");
const { numbersOk } = await import("../src/lib/dialog.ts");

const P = {
  live: true,
  asOf: "2026-11-16 20:30",
  ujuAvg: 1588.8,
  ujuDiff: -0.4,
  natAvg: 1573.2,
  natDiff: 0.1,
  emd: "두서면",
  emdCheapest: { name: "두서주유소", price: 1499 },
  ujuCheapest: { name: "언양주유소", emd: "언양읍", price: 1450 },
};
const H = {
  today: "2026-11-16",
  label: "두서면 B 할아버지 부부",
  emd: "두서면",
  tank: 200,
  level: 69.4,
  emptyDate: "2026-11-25",
  daysLeft: 9,
  alertDate: "2026-11-14",
  use7: 52.3,
  usual7: 41.8,
  coldDates: ["2026-11-19", "2026-11-20"],
  dealer: "두서 ○○상회",
  dealerPrice: 1580,
  ahead: Array(60).fill(8), // 오늘부터 날마다 쓸 양(L)
  ordered: false,
};

test("물어보기: 흔한 가격 질문과 '싸?'를 알아듣는다", () => {
  assert.equal(topicOf("오늘 등유 가격 알려 줘"), "why");
  assert.equal(topicOf("어디가 제일 싸?"), "cheapest");
  assert.equal(topicOf("정말 등유값 왜 이래?"), "why");
  assert.equal(topicOf("두 말 얼마야?"), "amount");
  assert.equal(topicOf("값은 어떻게 내?"), "pay");
});

test("물어보기: 질문 속 읍면 이름을 찾는다", () => {
  assert.equal(emdIn("두서면 등유 제일 싼 곳 어디야?"), "두서면");
  assert.equal(emdIn("두서 1,500원 밑으로 내려가면 알려 줘"), "두서면");
  assert.equal(emdIn("등유 얼마야?"), null);
});

test("물어보기: 지난 소진일·알림일은 지난 일로 말하고, 챗봇에서 주문을 권하지 않는다", () => {
  const past = { ...H, level: 0, emptyDate: "2026-11-08", daysLeft: -8, alertDate: "2026-10-18" };
  const a = templateAnswer("empty", P, past, "언제 떨어져?");
  assert.match(a, /떨어졌을/);
  assert.doesNotMatch(a, /도와드릴까요/);
  const b = templateAnswer("alert", P, H, "기름 떨어지기 전에 알려 줘"); // H는 알림일 11/14 < 오늘 11/16
  assert.match(b, /오늘/);
  assert.doesNotMatch(b, /11월 14일/);
  assert.match(templateAnswer("empty", P, { ...H, ordered: true }, "언제 떨어져?"), /주문이 들어가/);
});
const allow = (q, facts) => ({ 질문: q, ...Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, `${k} ${v}`])) });

// 바우처 잔액은 기관과 연계하기 전에는 알 수 없다. 챗봇은 잔액을 말하지 않고, 이용자가 말한 금액으로만 계산한다
test("바우처 금액 읽기", () => {
  assert.equal(parseWon("바우처 30만 원 남았는데 얼마나 버텨?"), 300000);
  assert.equal(parseWon("44만 2,200원 남았어"), 442200);
  assert.equal(parseWon("바우처 300,000원 있어"), 300000);
  assert.equal(parseWon("바우처로 얼마나 버틸 수 있어?"), null);
});

test("바우처: 금액을 말하지 않으면 잔액 없이 확인 방법을 알려 준다", () => {
  const q = "바우처로 얼마나 버틸 수 있어?";
  for (const h of [H, null]) {
    const facts = factsFor("voucher", P, h, q);
    assert.ok(!Object.keys(facts).some((k) => /바우처 잔액\(/.test(k)), "가상 잔액이 사실 목록에 있음");
    const a = templateAnswer("voucher", P, h, q);
    assert.match(a, /1600-3190/);
    assert.doesNotMatch(a, /442/);
    assert.ok(numbersOk(a, allow(q, facts)), a);
  }
});

test("바우처: 말한 금액으로 살 수 있는 양과 버티는 날을 계산한다", () => {
  const q = "바우처 30만 원 남았는데 얼마나 버텨?";
  // 300,000 ÷ 1,580 = 약 190L. 하루 8L면 24일째에 다 씀(11/16 + 24일 = 12/10)
  const a = templateAnswer("voucher", P, H, q);
  assert.match(a, /300,000원/);
  assert.match(a, /약 190L/);
  assert.match(a, /약 24일/);
  assert.match(a, /12월 10일/);
  assert.ok(numbersOk(a, allow(q, factsFor("voucher", P, H, q))), a);
  // 집을 고르지 않으면 울주 평균 가격으로 양만 셈한다
  const b = templateAnswer("voucher", P, null, q);
  assert.match(b, /약 189L/);
  assert.ok(numbersOk(b, allow(q, factsFor("voucher", P, null, q))), b);
});

test("추천 질문은 모두 알맞은 종류로 간다", () => {
  assert.equal(topicOf(SUGGEST.cards[0]), "cheapest");
  assert.equal(topicOf(SUGGEST.cards[1]), "empty");
  assert.equal(topicOf(SUGGEST.cards[2]), "cold");
  assert.equal(topicOf(SUGGEST.cards[3]), "voucher");
  assert.equal(topicOf(SUGGEST.chips[0]), "amount");
  assert.equal(topicOf(SUGGEST.chips[1]), "why");
  assert.equal(topicOf(SUGGEST.chips[2]), "alert");
});

test("자주 묻는 말", () => {
  assert.equal(topicOf("기름 얼마나 남았어?"), "empty");
  assert.equal(topicOf("값은 어떻게 내?"), "pay");
  assert.equal(topicOf("언제 갖다줘?"), "delivery");
  assert.equal(topicOf("최고가격 고시가 뭐야"), "why");
  assert.equal(topicOf("손주가 언제 온다 했더라"), "other");
});

test("가격 알림 조건 읽기", () => {
  assert.equal(parsePriceRule("1,500원 밑으로 내려가면 알려 줘"), 1500);
  assert.equal(parsePriceRule("등유 1450원 이하면 알림"), 1450);
  assert.equal(parsePriceRule("1,500원이 뭐야"), null); // 알려 달라는 말이 없음
  assert.equal(parsePriceRule("5원 내려가면 알려 줘"), null); // 너무 작은 값
});

test("정해 둔 답은 사실 목록에 있는 숫자만 쓴다(집 있음·없음, 모든 종류)", () => {
  const topics = ["alert", "cheapest", "empty", "cold", "voucher", "amount", "why", "pay", "delivery", "other"];
  for (const h of [H, null]) {
    for (const t of topics) {
      const q = t === "alert" ? "1,500원 밑으로 내려가면 알려 줘" : "질문";
      const facts = factsFor(t, P, h);
      const allowed = { 질문: q, ...Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, `${k} ${v}`])) };
      const a = templateAnswer(t, P, h, q);
      assert.ok(a.length > 10, `${t} 빈 답`);
      assert.ok(numbersOk(a, allowed), `${t}${h ? "" : "(집 없음)"}: ${a}`);
    }
  }
});

test("가격을 못 불러오면 그렇다고 말한다", () => {
  const none = { ...P, emdCheapest: null, ujuCheapest: null };
  assert.match(templateAnswer("cheapest", none, null), /불러오지 못했어요/);
});

test("답 속 숫자 세기", () => {
  assert.equal(countNumbers("리터에 1,580원, 100L는 158,000원"), 3);
});

test("받침에 따라 조사를 고른다", () => {
  assert.equal(josa("상북 ○○상회", "은", "는"), "상북 ○○상회는");
  assert.equal(josa("현대주유소", "이", "가"), "현대주유소가");
  assert.equal(josa("청운주유소(상북면)", "이", "가"), "청운주유소(상북면)이");
  assert.equal(josa("두서 ○○상점", "은", "는"), "두서 ○○상점은");
});

test("먼저 전화하는 날이 지났으면 지금 넣을 때라고 말한다", () => {
  const a = templateAnswer("empty", P, H);
  assert.match(a, /지금 기름을 넣으실 때/);
  const b = templateAnswer("empty", P, { ...H, alertDate: "2026-11-20" });
  assert.match(b, /11월 20일 \(금\)에 먼저 전화/);
});
