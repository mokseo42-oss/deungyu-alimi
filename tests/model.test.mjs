// 소진 예측 모델 시험: 먼저 전화하는 날(알림일)과 소진일
// 실행: npm test  (Node 22.18 이상, 별도 설치 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url); // model.ts 안의 "@/data/…" 경로를 풀어 준다
const { project } = await import("../src/lib/model.ts");

// 날마다 같은 기온인 가짜 날씨. 평균 18℃면 난방도일 0, 4℃면 14
const day = (i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
const days = (n, tmean) => Array.from({ length: n }, (_, i) => ({ date: day(i), tmean, tmin: tmean - 4, src: "obs" }));

// 전화는 "잔량이 7일 쓸 양 + 50L 아래"이면서 "예상 소진일이 14일 안"일 때 간다.
// 하루 1L쯤 쓰는 가을에는 50L가 50일 치라, 앞 조건만으로는 소진 한 달 반 전에 전화가 갔다.
test("가을에 60L만 있는 집: 넣은 지 나흘 만이 아니라 소진 14일 전에 전화한다", () => {
  // 하루 1L(기본 사용량만). 60L는 60일째에 떨어진다
  const p = project({ tank: 200, k: 0.24, base: 1 }, days(120, 18), 0, 60, 0);
  assert.equal(p.emptyDate, day(60));
  assert.equal(p.alertDate, day(46));
});

test("겨울 보통 집: 소진 13일 전 전화는 그대로다", () => {
  // 하루 8L(기본 1 + 0.5 × 난방도일 14). 200L는 25일째에 떨어지고, 12일째에 104L로 기준 106L 아래가 된다
  const p = project({ tank: 200, k: 0.5, base: 1 }, days(120, 4), 0, 200, 0);
  assert.equal(p.emptyDate, day(25));
  assert.equal(p.alertDate, day(12));
});

test("겨울에 적게 쓰는 집: 소진 19일 전이 아니라 14일 전에 전화한다", () => {
  // 하루 4L(기본 0.5 + 0.25 × 14). 200L는 50일째에 떨어진다. 잔량 기준만 보면 31일째(76L)에 전화가 갔다
  const p = project({ tank: 200, k: 0.25, base: 0.5 }, days(120, 4), 0, 200, 0);
  assert.equal(p.emptyDate, day(50));
  assert.equal(p.alertDate, day(36));
});

test("계산한 기간 안에 떨어지지 않으면 잔량이 기준 아래여도 전화하지 않는다", () => {
  // 하루 1L, 55L. 30일 안에는 떨어지지 않는다
  const p = project({ tank: 200, k: 0.5, base: 1 }, days(30, 18), 0, 55, 0);
  assert.equal(p.emptyDate, null);
  assert.equal(p.alertDate, null);
});
