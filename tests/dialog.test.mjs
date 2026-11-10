// 규칙 분류(classify) 시험. Gemini가 실패하면 이 분류만으로 주문 여부가 정해진다.
// 실행: npm test  (Node 22.18 이상, 별도 설치 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/lib/dialog.ts";

const TANK = 200;
const intentOf = (text, stage) => classify(text, TANK, stage).t;

// 확인 단계에서 "yes"는 곧바로 주문이다. 거절·되묻기·양 바꾸기는 승낙이 아니어야 한다.
const confirmCases = [
  ["주문하지 마", "no"],
  ["주문 안 할래", "no"],
  ["넣어 주지 마", "no"],
  ["시키지 마", "no"],
  ["주문 취소해", "no"],
  ["네, 근데 주문은 하지 마", "no"],
  ["어떡하지", "unknown"],
  ["어디서 오는 거야?", "unknown"],
  ["응? 뭐라고?", "unknown"],
  ["네?", "unknown"],
  ["네가 누구야", "unknown"],
  ["반만 넣어 줘", "amount"],
  // 원래 되던 승낙·거절은 그대로
  ["네", "yes"],
  ["네네", "yes"],
  ["그래요", "yes"],
  ["응, 그렇게 해 줘", "yes"],
  ["주문해 줘", "yes"],
  ["아니요", "no"],
];

for (const [text, want] of confirmCases) {
  test(`확인 단계: "${text}" → ${want}`, () => {
    assert.equal(intentOf(text, "confirm"), want);
  });
}

// 화면의 빠른 답 버튼이 원래 뜻대로 분류되는지 (회귀 방지)
const quickCases = [
  ["gauge", "아래서 한 칸 남았나", "gauge"],
  ["gauge", "아직 많아", "plenty"],
  ["gauge", "세 칸쯤 있어", "gauge"],
  ["gauge", "바닥이야", "gauge"],
  ["gauge", "돈이 없어서 아껴 써", "money"],
  ["offer", "그래, 시켜 줘", "yes"],
  ["offer", "반만 넣어 줘", "amount"],
  ["offer", "아니, 됐어", "no"],
  ["offer", "비싸서 부담돼", "money"],
  ["checkin", "그럭저럭 잘 돌려", "fine"],
  ["checkin", "아껴 쓰고 있어", "money"],
  ["checkin", "딴 데서 넣었어", "elsewhere"],
  ["checkin", "집을 비웠었어", "away"],
  ["money", "응, 연결해 줘", "yes"],
  ["money", "아니, 괜찮아", "no"],
];

for (const [stage, text, want] of quickCases) {
  test(`${stage} 단계: "${text}" → ${want}`, () => {
    assert.equal(intentOf(text, stage), want);
  });
}

test('확인 단계 "반만 넣어 줘"는 100리터로 읽는다', () => {
  assert.deepEqual(classify("반만 넣어 줘", TANK, "confirm"), { t: "amount", liters: 100 });
});
