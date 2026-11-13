// 첫 화면 반복 애니메이션 시험: 9초마다 같은 그림으로 돌아오는지, 멈춘 그림에 이야기가 다 담기는지
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

const { LOOP, STILL, levelAt, heroFrame } = await import("../src/lib/heroLoop.ts");

test("눈금은 가득 찬 채로 시작하고, 끝나기 직전에도 가득 차 있어 이음매가 없다", () => {
  assert.equal(levelAt(0), 1);
  assert.ok(levelAt(LOOP - 0.01) > 0.999);
});

test("멈춘 그림(움직임 줄이기)에서는 눈금이 한 칸 이하다", () => {
  assert.ok(levelAt(STILL) <= 0.3);
});

test("처음 그림에는 말풍선이 없다", () => {
  assert.ok(!heroFrame(0).includes("어르신,"));
  assert.ok(!heroFrame(0).includes("시켜 줘"));
});

test("멈춘 그림에 예상 소진일, AI 말, 어르신 대답이 다 보인다", () => {
  const s = heroFrame(STILL);
  for (const words of ["11월 23일쯤 바닥", "등유 안심 AI", "어르신, 기름이", "떨어질 것 같아요.", "그래, 시켜 줘."]) {
    assert.ok(s.includes(words), `${words}가 없음`);
  }
});

test("LOOP초가 지나면 같은 그림이 나온다", () => {
  for (const t of [0.5, 2, 4.4, 6.3, 8.2]) assert.equal(heroFrame(t + LOOP), heroFrame(t));
});
