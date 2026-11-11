"use client";
import Link from "next/link";
import { Loading, SightGauge, StatusBadge, WeatherNote } from "@/components/ui";
import { Status, daysBetween, fmtDate, fmtL } from "@/lib/model";
import { APP_NAME, SCREENS } from "@/lib/routes";
import { View, useHouseholds } from "@/lib/useModel";

// 급한 집이 위로 오게
const URGENCY: Record<Status, number> = { check: 0, empty: 1, call: 2, ordered: 3, ok: 4 };

// 기능 화면 홈: 오늘 챙길 집을 먼저 보여 주고, 네 화면으로 가는 입구를 둔다
export default function AppHome() {
  const { weather, error, views } = useHouseholds();
  const sorted = views ? [...views].sort((a, b) => URGENCY[a.status] - URGENCY[b.status]) : null;
  const todo = sorted?.filter((v) => URGENCY[v.status] <= 2).length ?? 0;

  return (
    <div className="page">
      <header>
        <p className="text-[15px] font-medium text-muted">
          {APP_NAME}
          {weather ? ` · ${fmtDate(weather.today)}` : ""}
        </p>
        <h1 className="page-title mt-2">
          {!sorted ? "오늘 챙길 집을 계산하고 있습니다" : todo > 0 ? `오늘 챙길 집은 ${todo}곳입니다` : "오늘은 챙길 집이 없습니다"}
        </h1>
        <p className="page-lead">
          시연 가구 3곳의 남은 기름을 오늘 울주 기온과 예보로 다시 계산했습니다. 급한 집부터 보여 드립니다. 가구는 모두 가상입니다.
        </p>
        {weather && <WeatherNote fallback={weather.fallback} source={weather.source} />}
      </header>

      <section className="mt-12 md:mt-16" aria-label="오늘 챙길 집">
        {!sorted || !weather ? (
          <Loading error={error} />
        ) : (
          <ul className="border-t border-ink">
            {sorted.map((v) => (
              <HouseRow key={v.h.id} v={v} today={weather.today} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-20 md:mt-28">
        <h2 className="sec-title">화면 바로가기</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">
          처음이라면 왼쪽부터 차례로 보세요. AI 전화에서 넣은 주문이 판매소에 뜨고, 배달을 마치면 가구 잔량과 군 현황판이 바뀝니다.
        </p>
        <ul className="mt-8 grid gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {SCREENS.map((s) => (
            <li key={s.href} className="border-l border-line">
              <Link href={s.href} className="group block h-full py-1 pl-5 pr-5 hover:bg-mist md:pl-6">
                <span className="block text-[14px] text-muted">{s.who}</span>
                <span className="mt-2 block text-[24px] font-light leading-snug underline-offset-4 group-hover:underline">
                  {s.title}
                </span>
                <span className="mt-3 block text-[15px] leading-relaxed text-muted">{s.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function HouseRow({ v, today }: { v: View; today: string }) {
  const { h, proj } = v;
  const level = Math.max(0, proj.levelToday);
  const toEmpty = proj.emptyDate ? daysBetween(today, proj.emptyDate) : null;
  const urgent = v.status === "check" || v.status === "empty";
  return (
    <li className="grid gap-x-8 gap-y-5 border-b border-line py-7 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_252px] md:items-center md:py-8">
      <div className="flex items-center gap-5">
        <SightGauge ratio={level / h.tank} height={64} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href={`/households#h-${h.id}`} className="text-[21px] font-normal underline-offset-4 hover:underline md:text-[22px]">
              {h.label}
            </Link>
            <StatusBadge s={v.status} />
          </div>
          <p className="mt-1 text-[14px] text-muted">
            {h.channel} · 주문 승인: {h.approval}
          </p>
        </div>
      </div>
      <dl className="contents">
        <div>
          <dt className="text-[14px] text-muted">오늘 남은 기름(추정)</dt>
          <dd className="num mt-1 text-[26px] font-light leading-tight">{fmtL(level)}</dd>
        </div>
        <div>
          <dt className="text-[14px] text-muted">예상 소진일</dt>
          <dd className="num mt-1 text-[18px]">
            {fmtDate(proj.emptyDate)}
            {toEmpty != null && (
              <span className={`ml-2 text-[15px] ${toEmpty <= 0 ? "font-medium text-empty" : "text-muted"}`}>
                {toEmpty > 0 ? `${toEmpty}일 남음` : toEmpty === 0 ? "오늘" : `${-toEmpty}일 지남`}
              </span>
            )}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Link href={`/call?h=${h.id}`} className={`btn ${urgent || v.status === "call" ? "btn-primary" : ""}`}>
          {h.channel === "AI 스피커" ? "AI 스피커 안내" : "AI 전화"} 시연
        </Link>
        <Link href={`/households#h-${h.id}`} className="btn">
          자세히
        </Link>
      </div>
    </li>
  );
}
