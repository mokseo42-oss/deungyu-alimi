// 소진 예측 모델 시험: 먼저 전화하는 날(알림일)과 소진일
// 실행: npm test  (Node 22.18 이상, 별도 설치 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url); // model.ts 안의 "@/data/…" 경로를 풀어 준다
const { project, learnK, gaugeLow, keepLowK } = await import("../src/lib/model.ts");

// 날마다 같은 기온인 가짜 날씨. 평균 18℃면 난방도일 0, 4℃면 14
const day = (i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
const days = (n, tmean) => Array.from({ length: n }, (_, i) => ({ date: day(i), tmean, tmin: tmean - 4, src: "obs" }));

// 전화는 "잔량이 7일 쓸 양 + 50L 아래"이면서 "예상 소진일이 21일 안"일 때 간다.
// 하루 1L쯤 쓰는 가을에는 50L가 50일 치라, 앞 조건만으로는 소진 한 달 반 전에 전화가 갔다.
test("가을에 60L만 있는 집: 넣은 지 나흘 만이 아니라 소진 21일 전에 전화한다", () => {
  // 하루 1L(기본 사용량만). 60L는 60일째에 떨어진다
  const p = project({ tank: 200, k: 0.24, base: 1 }, days(120, 18), 0, 60, 0);
  assert.equal(p.emptyDate, day(60));
  assert.equal(p.alertDate, day(39));
});

test("겨울 보통 집: 소진 13일 전 전화는 그대로다", () => {
  // 하루 8L(기본 1 + 0.5 × 난방도일 14). 200L는 25일째에 떨어지고, 12일째에 104L로 기준 106L 아래가 된다
  const p = project({ tank: 200, k: 0.5, base: 1 }, days(120, 4), 0, 200, 0);
  assert.equal(p.emptyDate, day(25));
  assert.equal(p.alertDate, day(12));
});

test("겨울에 적게 쓰는 집: 21일 안이어도 잔량이 기준 아래로 내려간 소진 19일 전에 전화한다", () => {
  // 하루 4L(기본 0.5 + 0.25 × 14). 200L는 50일째에 떨어진다. 29일째(84L)는 21일 안이지만 기준 78L 위, 31일째(76L)에 아래가 된다
  const p = project({ tank: 200, k: 0.25, base: 0.5 }, days(120, 4), 0, 200, 0);
  assert.equal(p.emptyDate, day(50));
  assert.equal(p.alertDate, day(31));
});

test("계산한 기간 안에 떨어지지 않으면 잔량이 기준 아래여도 전화하지 않는다", () => {
  // 하루 1L, 55L. 30일 안에는 떨어지지 않는다
  const p = project({ tank: 200, k: 0.5, base: 1 }, days(30, 18), 0, 55, 0);
  assert.equal(p.emptyDate, null);
  assert.equal(p.alertDate, null);
});

// 눈금 답이 계산을 시작한 양보다 많으면(쓴 양이 0 이하) 그사이 다른 데서 넣은 것이다.
// 전에는 이때 집 계수를 최솟값 0.05 쪽으로 끌어내려, 다음 전화가 뒤로 밀렸다
test("쓴 양이 0 이하로 나오면 집 계수를 고치지 않는다", () => {
  const p = { tank: 200, k: 0.5, base: 1 };
  assert.equal(learnK(p, days(30, 4), 0, 20, -30, 0.3), 0.5);
  assert.equal(learnK(p, days(30, 4), 0, 20, 0, 0.3), 0.5);
});

test("쓴 양이 있으면 집 계수를 그만큼 고친다", () => {
  // 20일 동안 난방도일 280. 300L를 썼으면 관측 계수 (300 − 20) ÷ 280 = 1.0, 절반 반영하면 0.75
  assert.equal(learnK({ tank: 200, k: 0.5, base: 1 }, days(30, 4), 0, 20, 300, 0.5), 0.75);
});

// "한 칸 남았다"는 답은 소진일이 멀게 계산돼도 주문을 여쭐 만큼 적은 양이다
test("눈금이 한 칸 이하면 적게 남은 것으로 본다", () => {
  assert.equal(gaugeLow(200, 50), true);
  assert.equal(gaugeLow(200, 10), true);
  assert.equal(gaugeLow(200, 100), false);
  assert.equal(gaugeLow(400, 100), true);
});

// 계수가 이미 낮은 집('참는 집' 후보)이 예상보다 덜 썼다고 답하면, 더 낮게 배우지 않는다.
// 낮추면 다음 전화가 뒤로 밀려, 참는 집일수록 연락이 늦어진다
test("참는 집 후보는 눈금 답으로 집 계수를 낮추지 않는다", () => {
  assert.equal(keepLowK(0.24, 0.18, 0.25), 0.24);
  assert.equal(keepLowK(0.24, 0.3, 0.25), 0.3);
  assert.equal(keepLowK(0.5, 0.4, 0.25), 0.4);
});
