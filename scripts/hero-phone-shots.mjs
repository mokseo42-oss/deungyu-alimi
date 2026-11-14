// 첫 화면 휴대폰 틀(HeroPhone)에 들어가는 시연 화면 4장을 다시 찍는다.
// 앱 화면이 바뀌면 이걸 다시 돌린다. 헤드리스 Chrome을 DevTools 프로토콜로 움직인다(추가 패키지 없음, Node 22 이상).
//   node scripts/hero-phone-shots.mjs https://deungyu-alimi.vercel.app public/hero-phone
//   (로컬: npm run build && npm start 뒤 http://localhost:3000)
// Chrome 위치가 다르면 CHROME=/path/to/chrome 으로 알려 준다.
// 흐름: 시연 초기화 → 가구 잔량(A 할머니) → AI 전화 첫 말 → "아니, 없어"·"그래, 시켜 줘"·"네"로 주문 → 판매소에 들어온 주문
// 대답은 모두 낱말 규칙이 바로 읽는 말이라 Gemini를 부르지 않는다.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , base = "http://localhost:3000", outDir = "public/hero-phone"] = process.argv;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync(outDir, { recursive: true });

const port = 9300 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), `hero-phone-${port}`);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets = [];
for (let i = 0; i < 100 && !targets.some((t) => t.type === "page"); i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  } catch {
    await sleep(100);
  }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) rej(new Error(m.error.message));
    else res(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", { format: "jpeg", quality: 86 });
  writeFileSync(join(outDir, `${name}.jpg`), Buffer.from(s.data, "base64"));
  console.log("saved", name);
};
// 머리줄을 불투명하게: 반투명 흐림 뒤로 비치는 글자가 사진에서는 얼룩처럼 보인다
const go = async (path) => {
  await send("Page.navigate", { url: base + path });
  await ev(`new Promise((r) => (document.readyState === "complete" ? r(1) : addEventListener("load", () => r(1))))`);
  await ev("document.fonts.ready.then(() => 1)");
  await ev(`(() => { const s = document.createElement("style"); s.textContent = "header.sticky{background:#fff!important;backdrop-filter:none!important}"; document.head.append(s); return 1; })()`);
  await sleep(2000);
};
const click = (text) =>
  ev(`(() => { const b = [...document.querySelectorAll("button, a")].find((x) => x.textContent.trim() === ${JSON.stringify(text)} && !x.disabled); if (!b) return false; b.click(); return true; })()`);
// 글자가 든 제목을 찾아 그 카드를 머리줄 바로 아래로 올린다
const lift = (text) =>
  ev(`(() => {
    const own = (x) => [...x.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    const t = [...document.querySelectorAll("h1, h2, h3, div, span")].find((x) => own(x).startsWith(${JSON.stringify(text)}));
    if (!t) return false;
    const card = t.closest(".card, section") || t;
    const head = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
    window.scrollTo(0, window.scrollY + card.getBoundingClientRect().top - head - 12);
    return true;
  })()`);
const must = (ok, what) => {
  if (!ok) throw new Error(`화면에서 찾지 못함: ${what}`);
};

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await go("/home");
  await ev("localStorage.clear()");

  await go("/households");
  must(await lift("상북면 A 할머니"), "가구 잔량의 A 할머니");
  await sleep(400);
  await shot("1-households");

  await go("/call");
  await ev(`(() => { const c = document.querySelector("input[type=checkbox]"); if (c && c.checked) c.click(); return 1; })()`); // 음성 끄기
  must(await click("AI 스피커 안내 시작"), "AI 스피커 안내 시작 버튼");
  await sleep(2600);
  must(await lift("상북면 A 할머니"), "통화 카드");
  await sleep(400);
  await shot("2-call");
  for (const answer of ["아니, 없어", "그래, 시켜 줘", "네"]) {
    must(await click(answer), `대답 "${answer}"`);
    await sleep(2600);
  }
  must(await lift("상북면 A 할머니"), "통화 카드");
  await sleep(600);
  await shot("3-order");

  await go("/dealer");
  must(await lift("오늘 들어온 주문"), "판매소의 오늘 들어온 주문");
  await sleep(400);
  await shot("4-dealer");
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
