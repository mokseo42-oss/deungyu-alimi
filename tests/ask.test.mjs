// 등유 챗봇 시험: 질문 종류 가르기, 가격 알림 조건 읽기, 정해 둔 답의 숫자가 사실 목록과 맞는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
const { josa, topicOf, parsePriceRule, factsFor, templateAnswer, SUGGEST, countNumbers } = await import("../src/lib/ask.ts");
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
  voucher: 442200,
  voucherDays: 38,
  voucherUntil: "2026-12-24",
};

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
