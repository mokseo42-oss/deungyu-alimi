"use client";
import Link from "next/link";
import { useState } from "react";
import LevelChart from "@/components/LevelChart";
import { Loading, SightGauge, StatusBadge, WeatherNote } from "@/components/ui";
import { useHouseholds, View } from "@/lib/useModel";
import { daysBetween, fmtDate, fmtL, fmtMan, fmtWon } from "@/lib/model";
import { REGION_MEDIAN_K } from "@/data/households";
import { MONTHLY_HDD } from "@/data/ulju";
import { update } from "@/lib/store";

export default function HouseholdsPage() {
  const { weather, error, views } = useHouseholds();
  return (
    <div className="page">
      <header>
        <h1 className="page-title">가구 잔량</h1>
        <p className="page-lead">
          생활지원사와 가족이 보는 화면입니다. 매일 새벽 기온과 예보로 집마다 남은 기름을 다시 계산합니다. 가구는 모두 가상입니다.
        </p>
        {weather && <WeatherNote fallback={weather.fallback} source={weather.source} />}
      </header>
      <div className="mt-14 space-y-20 md:mt-20 md:space-y-28">
        {!views ? <Loading error={error} /> : views.map((v) => <HouseCard key={v.h.id} v={v} today={weather!.today} />)}
        <RegisterCalc />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-3 text-[15px]">
      <dt className="text-muted">{k}</dt>
      <dd className="num text-right font-medium">{v}</dd>
    </div>
  );
}

function Fig({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="fig">
      <dt className="fig-label">{label}</dt>
      <dd className={`fig-value whitespace-nowrap ${tone ?? ""}`}>{value}</dd>
      {sub && <dd className="fig-sub">{sub}</dd>}
    </div>
  );
}

function HouseCard({ v, today }: { v: View; today: string }) {
  const { h, proj } = v;
  const lowK = v.params.k < REGION_MEDIAN_K / 2;
  const level = Math.max(0, proj.levelToday);
  const toEmpty = proj.emptyDate ? daysBetween(today, proj.emptyDate) : null;
  return (
    <section id={`h-${h.id}`} className="border-t border-ink pt-8">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="text-[26px] font-light leading-snug md:text-[30px]">{h.label}</h2>
            <StatusBadge s={v.status} />
          </div>
          <p className="mt-1 text-[15px] text-muted">
            {h.person} · {h.channel} · 주문 승인: {h.approval}
            {h.family ? ` · 가족: ${h.family}` : ""}
          </p>
        </div>
        <Link href={`/call?h=${h.id}`} className="btn btn-primary">
          {h.channel === "AI 스피커" ? "AI 스피커 안내" : "AI 전화"} 시연
        </Link>
      </div>
      <p className="mt-5 max-w-3xl text-[17px] leading-relaxed">{h.scenario}</p>

      <div className="mt-10 flex items-stretch gap-5 md:gap-7">
        <SightGauge ratio={level / h.tank} height={100} />
        <dl className="grid flex-1 grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <Fig label="오늘 남은 기름(추정)" value={fmtL(level)} sub={`탱크 ${fmtL(h.tank)}`} />
          <Fig
            label="예상 소진일"
            value={fmtDate(proj.emptyDate)}
            tone={toEmpty != null && toEmpty <= 0 ? "text-empty" : ""}
            sub={
              toEmpty == null ? undefined : toEmpty > 0 ? (
                `${toEmpty}일 남음`
              ) : toEmpty === 0 ? (
                <span className="font-medium text-empty">오늘</span>
              ) : (
                <span className="font-medium text-empty">{-toEmpty}일 지남</span>
              )
            }
          />
          <Fig
            label="먼저 전화하는 날"
            value={fmtDate(proj.alertDate)}
            sub={`소진 3주 안 · ${proj.nextWeekCold ? "한파 예보로 여유분 70L" : "7일 쓸 양 + 50L 아래"}`}
          />
          {v.shortfall && (
            <Fig
              label="이번 겨울 본인 부담 비용"
              value={fmtMan(v.shortfall.shortfall)}
              sub={`예상 비용 − 바우처 잔액 ${fmtWon(h.voucherLeft)}`}
            />
          )}
        </dl>
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-[1.6fr_1fr] md:gap-14">
        <LevelChart v={v} />
        <div>
          <dl className="border-t border-line">
            <Row k="계산 시작" v={`${fmtDate(v.startDate)} · ${fmtL(v.startLevel)}`} />
            <Row
              k="집 계수"
              v={
                <>
                  {v.params.k.toFixed(2)} L/난방도일
                  {lowK && <span className="ml-1 text-check">(가정한 지역 중앙값의 절반 미만)</span>}
                </>
              }
            />
            {proj.nextWeekCold && <Row k="한파 예보" v={<span className="text-cold">여유분 70L로 상향</span>} />}
            {v.shortfall && (
              <>
                <Row k={`남은 겨울 사용량 (~${fmtDate(v.shortfall.end)})`} v={fmtL(v.shortfall.liters)} />
                <Row k={`예상 비용 (리터 ${v.price.toLocaleString()}원)`} v={fmtMan(v.shortfall.cost)} />
                <Row k="바우처 잔액 (가상)" v={fmtWon(h.voucherLeft)} />
              </>
            )}
          </dl>
          <p className="mt-4 text-sm text-muted">{h.notes.join(" · ")}</p>
        </div>
      </div>
    </section>
  );
}

// 03 기획안 4-1: 등록 질문으로 첫 겨울 집 계수 정하기
function RegisterCalc() {
  const [times, setTimes] = useState(6);
  const [each, setEach] = useState(200);
  const [base, setBase] = useState(1);
  const winterHdd = [11, 12, 1, 2, 3].reduce((a, m) => a + MONTHLY_HDD[m], 0);
  const total = times * each;
  const k = Math.max(0.05, (total - base * 151) / winterHdd);
  return (
    <section className="-mx-5 bg-mist px-5 py-12 md:-mx-8 md:px-8 md:py-16">
      <h2 className="text-[24px] font-light leading-snug md:text-[28px]">새 가구 등록: 첫 겨울 집 계수 계산</h2>
      <p className="mt-3 max-w-3xl text-[16px] leading-relaxed">
        배달 기록이 없는 첫 겨울에는 등록할 때 &quot;지난겨울 기름을 몇 번, 한 번에 얼마나 넣으셨나요?&quot;를 물어 초기값을 정합니다.
        첫 배달 뒤부터는 실제 배달량으로 고칩니다.
      </p>
      <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-5 text-[15px]">
        <label className="flex flex-col gap-2">
          지난겨울 넣은 횟수
          <input className="inp w-32" type="number" min={1} max={20} value={times} onChange={(e) => setTimes(+e.target.value)} />
        </label>
        <label className="flex flex-col gap-2">
          한 번에 (L)
          <select className="inp w-44" value={each} onChange={(e) => setEach(+e.target.value)}>
            <option value={100}>100L (드럼 반)</option>
            <option value={200}>200L (드럼 하나)</option>
            <option value={300}>300L</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          기본 사용량 (L/일)
          <input className="inp w-32" type="number" step={0.1} min={0} value={base} onChange={(e) => setBase(+e.target.value)} />
        </label>
        <div className="border-l border-[#a9a9a9] pl-6" aria-live="polite">
          <div className="text-[15px] font-medium">집 계수 초기값</div>
          <div className="num mt-1 text-[32px] font-light leading-tight">{k.toFixed(2)} L/난방도일</div>
        </div>
      </div>
      <p className="mt-8 max-w-4xl text-sm text-muted">
        계산: (지난겨울 총량 {total.toLocaleString()}L − 기본 {base}L × 151일) ÷ 울주 예년 평균(최근 세 겨울) 겨울 난방도일 {winterHdd.toLocaleString()}. 지역
        중앙값은 아직 재지 못해 {REGION_MEDIAN_K}로 가정했습니다(모의실험에 쓴 범위의 가운데). 집 계수가 그 절반({REGION_MEDIAN_K / 2}) 밑이면 &quot;원래 적게 쓰는 집&quot;이 아니라 참는 집일 수 있어 살펴보기 대상에 넣습니다.
      </p>
      <button
        className="mt-5 text-sm text-muted underline underline-offset-4 hover:text-ink"
        onClick={() =>
          update((s) => ({ ...s, kOverride: {}, gauges: {}, deliveries: {} }))
        }
      >
        A·B·C 가구 계수·눈금·배달 보정만 초기화
      </button>
    </section>
  );
}
