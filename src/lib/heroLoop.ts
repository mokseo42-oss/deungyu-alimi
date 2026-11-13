// 첫 화면 오른쪽 9초 반복 그림. 30초 소개 영상(선 그림, 흰 집과 탱크, 초록 점 말풍선)과 같은 그림체입니다.
// heroFrame(t)는 t초의 그림을 <svg viewBox="0 0 1000 1000"> 안에 넣을 문자열로 돌려줍니다(같은 t면 같은 그림).
// 칸 모양이 화면마다 달라 가운데(x 160~840, y 125~875)에 중요한 그림을 모았습니다.
// (1024px 노트북에서 칸은 약 480×704라 좌우가 x 159~841만 보입니다)
//
// 시간표(초)
//   0.4~2.4  탱크 눈금이 네 칸에서 한 칸 아래로      1.7~6.6  "11월 23일쯤 바닥"
//   2.6~4.2  등유 안심 AI 말풍선                    4.5~5.1  어르신 대답
//   5.5~6.2  유조차가 들어옴, 6.4~7.3 눈금이 다시 참   7.4~8.4  말풍선·유조차가 빠짐
//   8.4~9.0  처음 그림과 같음(이음매 없음)

export const LOOP = 9;
// 움직임 줄이기 설정일 때 보여 줄 한 장면: 두 말풍선이 다 뜨고 유조차가 오기 직전
export const STILL = 5.3;

const INK = "#111111";
const FUEL = "#d9650f";
const GREEN = "#1f9d55";
const MUTED = "#5f6168";
const WHITE = "#ffffff";
const GROUND = 790;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eio = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const eo = (p: number) => 1 - Math.pow(1 - p, 3);
const ei = (p: number) => p * p * p;
const f1 = (n: number) => Math.round(n * 10) / 10;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP;

/** 탱크 눈금(0~1). 1이면 네 칸이 다 찬 상태 */
export function levelAt(time: number): number {
  const t = wrap(time);
  const low = 0.22;
  if (t < 6.4) return lerp(1, low, eio(seg(t, 0.4, 2.4)));
  return lerp(low, 1, eio(seg(t, 6.4, 7.3)));
}

type Text = { anchor?: "start" | "middle" | "end"; weight?: number; op?: number };
function text(x: number, y: number, s: string, size: number, fill: string, o: Text = {}) {
  const { anchor = "start", weight = 500, op = 1 } = o;
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${f1(op)}">${esc(s)}</text>`;
}

function house() {
  return `<g stroke="${INK}" stroke-width="2.5" fill="${WHITE}" stroke-linejoin="round" vector-effect="non-scaling-stroke">
    <path d="M520,650 H556 V512" fill="none" vector-effect="non-scaling-stroke"/>
    <rect x="546" y="500" width="20" height="12" vector-effect="non-scaling-stroke"/>
    <rect x="40" y="600" width="480" height="${GROUND - 600}" vector-effect="non-scaling-stroke"/>
    <polygon points="8,602 552,602 496,527 64,527" vector-effect="non-scaling-stroke"/>
    <line x1="8" y1="612" x2="552" y2="612" vector-effect="non-scaling-stroke"/>
    <rect x="120" y="686" width="64" height="${GROUND - 686}" vector-effect="non-scaling-stroke"/>
    <rect x="280" y="650" width="160" height="88" vector-effect="non-scaling-stroke"/>
    <line x1="360" y1="650" x2="360" y2="738" vector-effect="non-scaling-stroke"/>
    <line x1="280" y1="694" x2="440" y2="694" vector-effect="non-scaling-stroke"/>
  </g>
  <circle cx="176" cy="742" r="3.5" fill="${INK}"/>`;
}

// 마당의 실외 탱크. 왼쪽 눈금 관(주황)이 남은 기름을 보여 준다
function tank(level: number) {
  const top = 618, bot = 752, h = bot - top;
  const lv = clamp(level) * (h - 4);
  let ticks = "";
  for (let k = 1; k < 4; k++) {
    const y = f1(bot - (h * k) / 4);
    ticks += `<line x1="651" y1="${y}" x2="663" y2="${y}" stroke="${INK}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  }
  return `<g stroke="${INK}" stroke-width="2.5" fill="${WHITE}" stroke-linejoin="round" vector-effect="non-scaling-stroke">
    <path d="M605,770 H520" fill="none" vector-effect="non-scaling-stroke"/>
    <line x1="628" y1="772" x2="628" y2="${GROUND}" vector-effect="non-scaling-stroke"/>
    <line x1="732" y1="772" x2="732" y2="${GROUND}" vector-effect="non-scaling-stroke"/>
    <path d="M605,600 V760 A75,17 0 0 0 755,760 V600" vector-effect="non-scaling-stroke"/>
    <ellipse cx="680" cy="600" rx="75" ry="17" vector-effect="non-scaling-stroke"/>
    <rect x="670" y="576" width="20" height="12" vector-effect="non-scaling-stroke"/>
  </g>
  <rect x="627" y="${top}" width="24" height="${h}" fill="${WHITE}" stroke="${INK}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
  <rect x="629" y="${f1(bot - 2 - lv)}" width="20" height="${f1(lv)}" fill="${FUEL}"/>
  ${ticks}`;
}

// 작은 유조차. x는 앞(운전석) 끝. 왼쪽으로 달려와 탱크 옆에 선다
function truck(x: number, t: number) {
  const rot = -t * 300;
  const wheel = (cx: number) =>
    `<g transform="translate(${f1(x + cx)},${GROUND - 18}) rotate(${f1(rot % 360)})"><circle r="18" fill="${WHITE}" stroke="${INK}" stroke-width="2.5" vector-effect="non-scaling-stroke"/><line x1="-12" y1="0" x2="12" y2="0" stroke="${INK}" stroke-width="2" vector-effect="non-scaling-stroke"/><line x1="0" y1="-12" x2="0" y2="12" stroke="${INK}" stroke-width="2" vector-effect="non-scaling-stroke"/></g>`;
  return `<g transform="translate(${f1(x)},0)" stroke="${INK}" stroke-width="2.5" fill="${WHITE}" stroke-linejoin="round" vector-effect="non-scaling-stroke">
    <path d="M0,${GROUND - 30} V${GROUND - 64} L22,${GROUND - 96} H86 V${GROUND - 30} Z" vector-effect="non-scaling-stroke"/>
    <path d="M12,${GROUND - 64} L30,${GROUND - 86} H74 V${GROUND - 64} Z" fill="#eef2f5" vector-effect="non-scaling-stroke"/>
    <rect x="92" y="${GROUND - 100}" width="200" height="70" rx="34" vector-effect="non-scaling-stroke"/>
    <rect x="-4" y="${GROUND - 34}" width="300" height="8" vector-effect="non-scaling-stroke"/>
    <line x1="124" y1="${GROUND - 66}" x2="260" y2="${GROUND - 66}" stroke="${FUEL}" stroke-width="4" vector-effect="non-scaling-stroke"/>
  </g>${wheel(40)}${wheel(170)}${wheel(240)}`;
}

// 말풍선: 초록 점(AI) 또는 회색 점(어르신), 이름, 글자가 한 자씩 나타남
type Bubble = { who: "ai" | "elder"; anchor: "start" | "end"; start: number; typeDur: number; out: number; size: number };
function bubble(t: number, x: number, y: number, lines: string[], b: Bubble) {
  const op = seg(t, b.start - 0.25, b.start) * (1 - seg(t, b.out, b.out + 0.5));
  if (op <= 0) return "";
  const ai = b.who === "ai";
  const col = ai ? GREEN : MUTED;
  const total = lines.join("").length;
  const shown = Math.ceil(total * seg(t, b.start, b.start + b.typeDur));
  const dotX = b.anchor === "start" ? x + 12 : x - 12;
  let s = `<g opacity="${f1(op)}"><circle cx="${dotX}" cy="${y - 10}" r="11" fill="${col}"/>`;
  if (t >= b.start && t <= b.start + b.typeDur + 0.3) {
    const ph = ((t - b.start) * 1.8) % 1;
    s += `<circle cx="${dotX}" cy="${y - 10}" r="${f1(11 + ph * 20)}" fill="none" stroke="${col}" stroke-width="3" opacity="${f1(1 - ph)}"/>`;
  }
  const lx = b.anchor === "start" ? x + 36 : x - 36;
  s += text(lx, y, ai ? "등유 안심 AI" : "어르신", 28, col, { anchor: b.anchor, weight: 700 });
  let used = 0;
  lines.forEach((ln, i) => {
    const k = clamp(shown - used, 0, ln.length);
    used += ln.length;
    if (k > 0) s += text(x, y + 62 + i * 58, ln.slice(0, k), b.size, INK, { anchor: b.anchor, weight: 700 });
  });
  return s + "</g>";
}

/** t초의 그림(svg 안쪽 마크업). t는 LOOP로 나눈 나머지로 다룬다 */
export function heroFrame(time: number): string {
  const t = wrap(time);
  let out = `<line x1="-100" y1="${GROUND}" x2="1100" y2="${GROUND}" stroke="${INK}" stroke-width="2" opacity="0.6" vector-effect="non-scaling-stroke"/>`;
  out += house();
  out += tank(levelAt(t));

  // 예상 소진일
  const tag = Math.min(seg(t, 1.7, 2.0), 1 - seg(t, 6.3, 6.6));
  if (tag > 0) out += text(600, 548, "11월 23일쯤 바닥", 30, FUEL, { weight: 700, op: tag });

  // 유조차: 들어와서 서고, 호스로 채운 뒤 다시 나간다
  if (t > 5.5 && t < 8.4) {
    const x = t < 7.6 ? lerp(1080, 790, eo(seg(t, 5.5, 6.2))) : lerp(790, 1080, ei(seg(t, 7.6, 8.4)));
    const hose = Math.min(seg(t, 6.15, 6.35), 1 - seg(t, 7.3, 7.5));
    if (hose > 0) {
      out += `<path d="M${f1(x + 96)},${GROUND - 62} C${f1(x + 20)},${GROUND + 10} 760,560 682,578" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity="${f1(hose)}" vector-effect="non-scaling-stroke"/>`;
    }
    out += truck(x, t);
  }

  out += bubble(t, 190, 200, ["어르신, 기름이 다음 주쯤", "떨어질 것 같아요."], {
    who: "ai",
    anchor: "start",
    start: 2.6,
    typeDur: 1.6,
    out: 7.4,
    size: 46,
  });
  out += bubble(t, 820, 400, ["그래, 시켜 줘."], { who: "elder", anchor: "end", start: 4.5, typeDur: 0.6, out: 7.5, size: 50 });
  // 말풍선과 땅 사이가 가운데 오도록 조금 내린다
  return `<g transform="translate(0,20)">${out}</g>`;
}
