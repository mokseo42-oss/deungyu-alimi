"use client";
import { useEffect, useRef, useState } from "react";
import { SightGauge, StatusBadge } from "@/components/ui";
import { EMDS } from "@/data/ulju";
import { QUICK } from "@/lib/dialog";
import { daysBetween, fmtDate, fmtL, fmtWon } from "@/lib/model";
import { SCREENS } from "@/lib/routes";
import { View, suggestLiters, useHouseholds } from "@/lib/useModel";

const STEPS = SCREENS;

const PIN_QUERY = "(min-width: 1024px) and (min-height: 640px)";

// 소개 페이지의 검은 띠. 넓은 화면에서는 구역이 화면에 붙어 있는 동안 스크롤에 따라 네 화면이 차례로 바뀐다.
// 여기서는 기능 화면으로 넘어가지 않고, 왼쪽 휴대폰 그림만 바뀐다.
export default function ScreenTour() {
  const outer = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { weather, views } = useHouseholds();

  useEffect(() => {
    const mq = window.matchMedia(PIN_QUERY);
    const measure = () => {
      const el = outer.current;
      if (!el || !mq.matches) return;
      // 붙어 있는 틀의 높이는 화면 높이에서 메뉴 높이를 뺀 값이므로, 그 차이가 붙는 위치다
      const pinH = el.querySelector<HTMLElement>(".tour-pin")?.offsetHeight ?? window.innerHeight;
      const pinTop = window.innerHeight - pinH;
      const r = el.getBoundingClientRect();
      const travel = r.height - pinH;
      if (travel <= 0) return;
      const p = Math.min(0.9999, Math.max(0, (pinTop - r.top) / travel));
      setActive(Math.floor(p * STEPS.length));
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  function pick(i: number) {
    const el = outer.current;
    if (!el || !window.matchMedia(PIN_QUERY).matches) return setActive(i);
    const pin = el.querySelector<HTMLElement>(".tour-pin");
    const pinTop = window.innerHeight - (pin?.offsetHeight ?? window.innerHeight);
    const r = el.getBoundingClientRect();
    const travel = r.height - (window.innerHeight - pinTop);
    const top = window.scrollY + r.top - pinTop + (travel * (i + 0.5)) / STEPS.length;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: calm ? "auto" : "smooth" });
  }

  const a = views?.find((v) => v.h.id === "A");
  const c = views?.find((v) => v.h.id === "C");

  return (
    <section id="screens" ref={outer} className="tour on-night bg-night text-white">
      <div className="tour-pin">
        <div className="wrap tour-in w-full">
          <header className="text-center">
            <p className="text-[16px] md:text-[17px]">모두를 위한 등유 안심</p>
            <h2 className="mt-2 text-[26px] font-light leading-snug md:text-[32px]">
              어르신, 가족, 판매소, 군청 모두에게 도움이 됩니다
            </h2>
          </header>

          <div className="tour-grid grid items-center gap-x-20 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="order-last flex justify-center lg:order-none lg:justify-end">
              <div className="tour-phone" aria-hidden="true">
                {!a || !c || !weather ? (
                  <p className="grid h-full place-items-center text-center text-[13px] text-muted">울주군 기온과 예보를 불러오는 중…</p>
                ) : active === 0 ? (
                  <HouseScreen v={a} today={weather.today} />
                ) : active === 1 ? (
                  <CallScreen v={a} />
                ) : active === 2 ? (
                  <DealerScreen v={a} />
                ) : (
                  <BoardScreen v={c} today={weather.today} />
                )}
              </div>
            </div>

            <ol>
              {STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <li key={s.title}>
                    <button
                      type="button"
                      aria-current={on ? "step" : undefined}
                      onClick={() => pick(i)}
                      className={`tour-step block w-full text-left ${on ? "" : "opacity-50 hover:opacity-80"}`}
                    >
                      <span className="flex flex-wrap items-baseline gap-x-4">
                        <span className="text-[26px] font-light leading-tight md:text-[30px]">{s.title}</span>
                        <span className="text-[15px] text-night-muted">{s.who}</span>
                      </span>
                      <span data-on={on} className="tour-body mt-3 max-w-xl text-[16px] leading-relaxed md:text-[18px]">
                        {s.body}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium text-muted">{children}</p>;
}

function Line({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2 text-[12px]">
      <span className="text-muted">{k}</span>
      <span className="num text-right font-medium">{v}</span>
    </div>
  );
}

function Fake({ primary, children }: { primary?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`flex flex-1 items-center justify-center whitespace-nowrap border px-2 py-2 text-[12px] font-medium ${
        primary ? "border-ink bg-ink text-white" : "border-[#c4c4c4]"
      }`}
    >
      {children}
    </span>
  );
}

function HouseScreen({ v, today }: { v: View; today: string }) {
  const level = Math.max(0, v.proj.levelToday);
  const pts = v.proj.points;
  const ti = Math.max(0, pts.findIndex((p) => p.date === today));
  const shown = pts.slice(0, Math.min(pts.length, ti + 31));
  const W = 230,
    H = 84;
  const x = (i: number) => (i / Math.max(1, shown.length - 1)) * W;
  const y = (l: number) => 4 + (1 - Math.max(0, l) / v.h.tank) * (H - 8);
  const line = (from: number, to: number) =>
    shown
      .slice(from, to + 1)
      .map((p, i) => `${i ? "L" : "M"}${x(from + i).toFixed(1)},${y(p.level).toFixed(1)}`)
      .join("");
  return (
    <div className="flex h-full flex-col">
      <Kicker>가구 잔량</Kicker>
      <div className="mt-1 flex items-center justify-between gap-2">
        <b className="text-[15px] font-semibold">{v.h.label}</b>
        <span className="origin-right scale-[0.85]">
          <StatusBadge s={v.status} />
        </span>
      </div>
      <div className="mt-5 flex items-end gap-3">
        <SightGauge ratio={level / v.h.tank} height={72} />
        <div>
          <div className="text-[11px] text-muted">오늘 남은 기름(추정)</div>
          <div className="num text-[40px] font-light leading-none">{fmtL(level)}</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-5 w-full">
        <line x1="0" x2={W} y1={H - 4} y2={H - 4} stroke="var(--line)" />
        <path d={line(0, ti)} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        <path d={line(ti, shown.length - 1)} fill="none" stroke="var(--fuel)" strokeWidth="2.5" />
        <line x1={x(ti)} x2={x(ti)} y1="0" y2={H - 4} stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 3" />
      </svg>
      <div className="mt-2">
        <Line k="예상 소진일" v={fmtDate(v.proj.emptyDate)} />
        <Line k="먼저 전화하는 날" v={fmtDate(v.proj.alertDate)} />
      </div>
      <div className="mt-auto flex pt-4">
        <Fake primary>{v.h.channel === "AI 스피커" ? "AI 스피커 안내" : "AI 전화"} 시연</Fake>
      </div>
    </div>
  );
}

function CallScreen({ v }: { v: View }) {
  const speaker = v.h.channel === "AI 스피커";
  const hello = speaker
    ? "어르신, 안녕하세요. 등유 안심 AI예요. 저는 사람이 아니라 인공지능이에요."
    : "어르신, 안녕하세요. 울주군 등유 안심 AI입니다. 이 전화는 인공지능이 걸었어요.";
  const cold = v.proj.nextWeekCold ? "이번 주 한파 예보가 있어서 " : "날이 추워지면서 ";
  return (
    <div className="flex h-full flex-col">
      <Kicker>AI 전화</Kicker>
      <div className="mt-1 border-b border-line pb-3">
        <b className="text-[15px] font-semibold">{v.h.label}</b>
        <div className="text-[11px] text-muted">
          {v.h.channel} · 주문 승인: {v.h.approval}
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted">{speaker ? "AI 스피커가 말을 겁니다" : "전화가 옵니다"}</p>
      <div className="mt-3 bg-mist px-3 py-2.5 text-[13px] leading-relaxed">
        <div className="mb-0.5 text-[10px] font-semibold text-muted">AI</div>
        {hello} {cold}보일러 기름이 {fmtDate(v.proj.emptyDate)}쯤 떨어질 것 같아요. 탱크 눈금이 지금 어디쯤인가요?
      </div>
      <div className="mt-3 ml-auto max-w-[80%] bg-ink px-3 py-2.5 text-[13px] leading-relaxed text-white">
        <div className="mb-0.5 text-[10px] font-semibold opacity-70">어르신</div>
        {QUICK.gauge[0]}
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        {QUICK.gauge.slice(1, 4).map((q) => (
          <span key={q} className="border border-[#c4c4c4] px-2 py-1.5 text-[11px]">
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

function DealerScreen({ v }: { v: View }) {
  const liters = suggestLiters(v.h.tank, Math.max(0, v.proj.levelToday));
  return (
    <div className="flex h-full flex-col">
      <Kicker>판매소</Kicker>
      <b className="mt-1 text-[15px] font-semibold">오늘 들어온 주문</b>
      <div className="mt-3 border border-line p-3">
        <div className="text-[13px] font-semibold">{v.h.label}</div>
        <div className="text-[11px] text-muted">{v.h.dealer}</div>
        <div className="mt-2">
          <Line k="양" v={fmtL(liters)} />
          <Line k="금액" v={fmtWon(liters * v.price)} />
          <Line k="경로" v={v.h.channel} />
          <Line k="상태" v="접수" />
        </div>
        <div className="mt-3 flex gap-1.5">
          <Fake>확인 전화 완료</Fake>
          <Fake>취소</Fake>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <div className="text-[11px] text-muted">배달량을 입력하면 집 계수를 다시 계산합니다</div>
        <div className="mt-2 flex gap-1.5">
          <span className="num flex w-20 items-center justify-between border border-[#c4c4c4] px-2 py-2 text-[12px]">
            {liters} <span className="text-muted">L</span>
          </span>
          <Fake primary>배달 완료</Fake>
        </div>
      </div>
    </div>
  );
}

function BoardScreen({ v, today }: { v: View; today: string }) {
  const days = v.proj.emptyDate && v.proj.emptyDate <= today ? daysBetween(v.proj.emptyDate, today) : null;
  const first = EMDS.filter((e) => e.priority === 1);
  return (
    <div className="flex h-full flex-col">
      <Kicker>군 현황판</Kicker>
      <b className="mt-1 text-[15px] font-semibold">살펴봐 주세요</b>
      <div className="mt-3 border border-ink p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold">{v.h.label}</span>
          <span className="origin-right scale-[0.85]">
            <StatusBadge s={v.status} />
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          {days != null && days > 0 ? `예상 소진일 ${fmtDate(v.proj.emptyDate)}에서 ${days}일 지남 · ` : ""}
          집 계수 {v.params.k.toFixed(2)}
        </p>
        <div className="mt-3 flex gap-1.5">
          <Fake>방문 배정</Fake>
          <Fake>해결</Fake>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <div className="text-[11px] text-muted">1순위 면의 65세 이상 인구</div>
        <div className="mt-1 border-t border-ink">
          {first.map((e) => (
            <Line key={e.name} k={e.name} v={`${e.elderly.toLocaleString()}명`} />
          ))}
        </div>
      </div>
    </div>
  );
}
