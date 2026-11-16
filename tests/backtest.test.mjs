// 지난 겨울 되돌려 보기(검증 화면) 시험. 인터넷 없이 돌도록 겨울 기온을 만들어 쓴다
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
const { runBacktest, lastWinter, median, DEFAULT_OPTS, MIN_DELIVERY } = await import("../src/lib/backtest.ts");

// 10월 1일 8℃ → 1월 초 -4℃ → 3월 말 8℃, 날마다 ±3℃ 흔들림(고정)
const days = Array.from({ length: 182 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 9, 1 + i)).toISOString().slice(0, 10);
  const tmean = 8 - 12 * Math.sin((Math.PI * i) / 181) + 3 * Math.sin(i * 1.7);
  return { date: d, tmean, tmin: tmean - 6, src: "obs" };
});
const O = { ...DEFAULT_OPTS, households: 40 };
const r = runBacktest(days, O);

test("지난 겨울은 다 끝난 가장 최근 겨울", () => {
  assert.deepEqual(lastWinter("2026-11-16"), { from: "2025-10-01", to: "2026-03-31" });
  assert.deepEqual(lastWinter("2026-02-10"), { from: "2024-10-01", to: "2025-03-31" });
  assert.deepEqual(lastWinter("2026-04-01"), { from: "2025-10-01", to: "2026-03-31" });
});

test("같은 seed면 같은 결과(시연 때 숫자가 바뀌지 않음)", () => {
  const again = runBacktest(days, O);
  assert.equal(again.sModel.onTime, r.sModel.onTime);
  assert.equal(again.sFlat.dryDays, r.sFlat.dryDays);
});

test("두 방식은 같은 가구, 같은 진짜 사용량으로 겨룬다", () => {
  assert.equal(r.model.length, r.flat.length);
  r.model.forEach((h, i) => assert.equal(h.series[0].trueLevel, r.flat[i].series[0].trueLevel));
});

test("기온을 보는 모델이 하루 평균만 보는 방식보다 덜 바닥난다", () => {
  assert.ok(r.sModel.dryDays <= r.sFlat.dryDays, `${r.sModel.dryDays} > ${r.sFlat.dryDays}`);
  assert.ok(r.sModel.onTime / r.sModel.deliveries >= r.sFlat.onTime / r.sFlat.deliveries);
});

test("배달 기록이 쌓이면 집 계수 오차가 줄어든다", () => {
  const first = median(r.sModel.kErrByDelivery[0]);
  const third = median(r.sModel.kErrByDelivery[3]);
  assert.ok(third < first, `${third} >= ${first}`);
});

test("판매소는 50L보다 적게는 넣지 않는다", () => {
  for (const h of r.model) for (const d of h.deliveries) assert.ok(d.liters >= MIN_DELIVERY, `${h.truth.id} ${d.liters}`);
});

test("반 드럼 집은 한 번에 100L까지만", () => {
  for (const h of r.model.filter((x) => x.truth.half)) for (const d of h.deliveries) assert.ok(d.liters <= 100);
});
