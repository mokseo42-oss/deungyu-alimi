// 규칙 분류(classify) 시험. Gemini가 실패하면 이 분류만으로 주문 여부가 정해진다.
// 실행: npm test  (Node 22.18 이상, 별도 설치 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/lib/dialog.ts";
import * as dialog from "../src/lib/dialog.ts";

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

// ---- 2026-11-12 배포 사이트 점검에서 나온 것 ----

// 확인 단계의 승낙은 곧 주문이다. "네·어·응"으로 시작해도 되묻는 말, 망설이는 말, 딴소리는 승낙이 아니다.
// Gemini가 시간 초과로 답하지 못해 규칙으로 넘어온 통화에서 "어 잠깐만, 누구라고?"가 주문으로 처리됐다.
const notConsent = [
  ["어 잠깐만, 누구라고?", "unknown"],
  ["어 그래? 얼만데?", "unknown"],
  ["네 뭐라고요?", "unknown"],
  ["예 여보세요", "unknown"],
  ["어 누구요?", "unknown"],
  ["네 잠깐만요", "unknown"],
  ["어 생각 좀 해 볼게", "unknown"],
  ["응 근데 아들한테 물어보고", "unknown"],
  ["주문은 무슨 주문이야", "unknown"],
  ["주문했다고?", "unknown"],
  ["뭘 넣어?", "unknown"],
  ["연결이 안 좋네, 뭐라고?", "unknown"],
  ["어 안 들려", "unknown"],
  ["좋아 보이네 근데 누구세요", "unknown"],
  ["맞아 맞아 근데 내일 다시 전화해", "unknown"],
  ["어 우리 아들이 시킨다 카던데", "unknown"],
  ["넣어 놨다 카이", "unknown"],
  ["주문 말고 가격만 알려 줘", "unknown"],
  ["어 그거는 아들한테 연결해 봐", "unknown"],
  // 음성 인식은 물음표를 붙여 주지 않는다
  ["네 뭐라고요", "unknown"],
  ["어 그래 얼만데", "unknown"],
  // 승낙 낱말 뒤에 거절이 오면 거절이다
  ["네, 다음에 할게요", "no"],
  ["어 아이다", "no"],
  ["네 됐심더", "no"],
  ["응 마 치아라", "no"],
];

for (const [text, want] of notConsent) {
  test(`확인 단계: "${text}"는 주문하지 않는다 → ${want}`, () => {
    assert.equal(intentOf(text, "confirm"), want);
  });
}

// 그래도 분명한 승낙은 사투리여도 주문이다
for (const text of ["예 그리 하이소", "맞심더", "오야", "그래 넣어 줘", "네 주문해 주세요"]) {
  test(`확인 단계: "${text}" → yes`, () => {
    assert.equal(intentOf(text, "confirm"), "yes");
  });
}

// 돈 단계의 승낙은 곧 생활지원사 연결이다. 확인 단계와 같은 기준으로 읽는다.
test('돈 단계: "어 누구한테 연결한다고?"는 연결하지 않는다', () => {
  assert.equal(intentOf("어 누구한테 연결한다고?", "money"), "unknown");
});

// 주문량: 한 드럼 = 200리터, 한 말 = 20리터. "반"은 제안·확인 단계에서는 탱크 눈금이 아니라 주문량이다.
const amountCases = [
  ["offer", "너무 많다 반 드럼만 넣어도", 100],
  ["offer", "반 드럼", 100],
  ["offer", "한 드럼 넣어 줘", 200],
  ["offer", "다섯 말만", 100],
  ["offer", "두 말만 넣어 줘", 40],
  ["confirm", "반 드럼만", 100],
];

for (const [stage, text, liters] of amountCases) {
  test(`${stage} 단계: "${text}" → ${liters}리터`, () => {
    assert.deepEqual(classify(text, TANK, stage), { t: "amount", liters });
  });
}

const stageCases = [
  ["offer", "한 말씀만 드릴게요", "unknown"], // '말'은 양을 세는 말일 때만
  ["offer", "가득 채워 줘", "yes"], // 제안량이 이미 채우는 양이다
  ["gauge", "반쯤 남았어", "gauge"], // 눈금을 물을 때의 "반"은 그대로 눈금
  ["checkin", "한 칸 남았어", "gauge"],
  // 경상도 말
  ["offer", "해 주이소", "yes"],
  ["offer", "그리 하소", "yes"],
  ["offer", "오야", "yes"],
  ["offer", "됐다 마", "no"],
  ["offer", "아이다", "no"],
  ["offer", "치아라", "no"],
];

for (const [stage, text, want] of stageCases) {
  test(`${stage} 단계: "${text}" → ${want}`, () => {
    assert.equal(intentOf(text, stage), want);
  });
}

test('제안 단계: "그렇게 해 주세요" → yes', () => {
  assert.equal(intentOf("그렇게 해 주세요", "offer"), "yes");
});

// 눈금을 "칸" 대신 "눈금"으로, 바닥을 "다 썼다"로 말해도 읽는다
test('눈금 단계: "밑에서 한 눈금"은 네 칸 중 한 칸(50리터)', () => {
  assert.deepEqual(classify("밑에서 한 눈금", TANK, "gauge"), { t: "gauge", liters: 50, label: "네 칸 중 한 칸" });
});
test('눈금 단계: "거의 다 썼어"는 바닥(10리터)', () => {
  assert.deepEqual(classify("거의 다 썼어", TANK, "gauge"), { t: "gauge", liters: 10, label: "바닥" });
});

// Gemini가 승낙이라고 해도, 승낙이 곧 행동인 단계에서 되묻거나 망설이는 말이면 다시 묻는다
const vetoCases = [
  ["yes", "어 잠깐만, 누구라고?", "confirm", "unknown"],
  ["yes", "네 근데 얼마라고요", "confirm", "unknown"],
  ["yes", "어 누구한테 연결한다고?", "money", "unknown"],
  ["yes", "네, 주문해 주세요", "confirm", "yes"],
  ["yes", "예 그리 하이소", "confirm", "yes"],
  ["yes", "얼만데? 그래 시켜 줘", "offer", "yes"], // 제안 단계의 승낙은 확인 질문으로 이어질 뿐이다
  ["no", "아니 누구라고?", "confirm", "no"],
];

for (const [llm, text, stage, want] of vetoCases) {
  test(`Gemini가 ${llm}라고 한 "${text}" (${stage} 단계) → ${want}`, () => {
    assert.equal(dialog.safeIntent({ t: llm }, text, stage).t, want);
  });
}

// AI 답 속 숫자는 사실 목록의 숫자와 같아야 한다. 일부만 겹치는 숫자(1,560원 속의 5, 15, 60)는 통과시키지 않는다.
const FACTS = {
  "단골 판매소 가격": "리터에 1,560원",
  "예상 소진일": "11월 27일 (금)",
  배달: "주문 뒤 판매소가 확인 전화를 하고 보통 1~3일 안에 배달",
};
const numberCases = [
  ["리터에 1,560원이에요", true],
  ["27일쯤 떨어질 것 같아요", true],
  ["보통 1~3일 안에 가요", true],
  ["곧 연락드릴게요", true],
  ["5일 안에 갖다드려요", false],
  ["15일쯤이에요", false],
  ["60리터 남았어요", false],
];

for (const [text, want] of numberCases) {
  test(`숫자 검사: "${text}" → ${want ? "통과" : "버림"}`, () => {
    assert.equal(dialog.numbersOk(text, FACTS), want);
  });
}
