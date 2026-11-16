// 알림 발송 규칙(기름알리미와 같은 규칙) 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideSend, morningIfQuiet } from "../src/lib/notify.ts";

const n = (o) => ({ hid: "A", kind: "소진 예상", cat: "안내", at: "2026-11-16T10:00", ...o });
const sent = (o) => ({ id: Math.random().toString(), text: "", status: "보냄", ...n(o) });

test("밤 9시부터 아침 8시까지는 아침 8시로 미룬다", () => {
  assert.equal(morningIfQuiet("2026-11-16T21:30"), "2026-11-17T08:00");
  assert.equal(morningIfQuiet("2026-11-16T06:10"), "2026-11-16T08:00");
  assert.equal(morningIfQuiet("2026-11-16T20:59"), "2026-11-16T20:59");
  const d = decideSend(n({ at: "2026-11-16T23:00" }), []);
  assert.deepEqual(d, { status: "아침에 보냄", sendAt: "2026-11-17T08:00" });
  assert.equal(decideSend(n({ at: "2026-11-16T23:00", cat: "확인", kind: "주문", orderId: "o1" }), []).status, "아침에 보냄");
});

test("긴급은 밤에도 바로 보낸다", () => {
  assert.deepEqual(decideSend(n({ at: "2026-11-16T02:00", cat: "긴급", kind: "몸이 안 좋음" }), []), {
    status: "보냄",
    sendAt: "2026-11-16T02:00",
  });
});

test("같은 알림은 한 번만", () => {
  assert.equal(decideSend(n({}), [sent({})]).status, "같은 알림이라 안 보냄");
  // 다른 날이면 다시 보낸다
  assert.equal(decideSend(n({ at: "2026-11-17T10:00" }), [sent({})]).status, "보냄");
  // 주문에 딸린 알림은 주문마다
  const o1 = sent({ kind: "주문", cat: "확인", orderId: "o1" });
  assert.equal(decideSend(n({ kind: "주문", cat: "확인", orderId: "o1" }), [o1]).status, "같은 알림이라 안 보냄");
  assert.equal(decideSend(n({ kind: "주문", cat: "확인", orderId: "o2" }), [o1]).status, "보냄");
  // 같은 날 같은 긴급도 한 번
  const g = sent({ kind: "무응답", cat: "긴급" });
  assert.equal(decideSend(n({ kind: "무응답", cat: "긴급" }), [g]).status, "같은 알림이라 안 보냄");
  // 안 보낸 알림은 '이미 보낸 것'으로 치지 않는다
  assert.equal(decideSend(n({}), [sent({ status: "같은 알림이라 안 보냄" })]).status, "보냄");
});

test("안내 알림은 한 사람에게 하루 2건까지, 확인·긴급은 세지 않는다", () => {
  const two = [sent({ kind: "a" }), sent({ kind: "b" })];
  assert.equal(decideSend(n({ kind: "c" }), two).status, "하루 2건이 넘어 안 보냄");
  assert.equal(decideSend(n({ kind: "주문", cat: "확인", orderId: "o9" }), two).status, "보냄");
  assert.equal(decideSend(n({ kind: "보일러", cat: "긴급" }), two).status, "보냄");
  // 다른 사람(다른 집) 알림은 세지 않는다
  assert.equal(decideSend(n({ hid: "B", kind: "c" }), two).status, "보냄");
  // 확인 알림이 많아도 안내는 막히지 않는다
  const confirms = [sent({ kind: "주문", cat: "확인", orderId: "1" }), sent({ kind: "배달", cat: "확인", orderId: "1" })];
  assert.equal(decideSend(n({}), confirms).status, "보냄");
});
