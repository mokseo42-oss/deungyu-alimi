// 첫 화면 휴대폰 틀 시험: 넘어가는 화면 사진이 다 있고, 크기가 휴대폰 화면 비율과 맞는지
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { PHONE_SLIDES, SHOT_W, SHOT_H, STILL_SLIDE, SLIDE_MS, SLIDE_MOVE_MS } = await import("../src/lib/heroPhone.ts");

// JPEG 머리(SOF)에서 가로·세로를 읽는다
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}

test("화면 사진이 모두 public에 있고, next/image에 적은 크기와 같다", () => {
  for (const s of PHONE_SLIDES) {
    const buf = readFileSync(new URL(`../public${s.src}`, import.meta.url));
    assert.deepEqual(jpegSize(buf), [SHOT_W, SHOT_H], s.src);
  }
});

test("화면 이름은 겹치지 않고, 멈춤 화면은 목록 안에 있다", () => {
  assert.equal(new Set(PHONE_SLIDES.map((s) => s.label)).size, PHONE_SLIDES.length);
  assert.ok(STILL_SLIDE >= 0 && STILL_SLIDE < PHONE_SLIDES.length);
});

test("넘어가는 시간이 보여 주는 시간보다 짧다", () => {
  assert.ok(SLIDE_MOVE_MS < SLIDE_MS / 2);
});
