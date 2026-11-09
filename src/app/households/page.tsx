"use client";
import Link from "next/link";
import { useState } from "react";
import LevelChart from "@/components/LevelChart";
import { Loading, StatusBadge, WeatherNote } from "@/components/ui";
import { useHouseholds, View } from "@/lib/useModel";
import { daysBetween, fmtDate, fmtL, fmtWon } from "@/lib/model";
import { REGION_MEDIAN_K } from "@/data/households";
import { MONTHLY_HDD } from "@/data/ulju";
import { update } from "@/lib/store";

export default function HouseholdsPage() {
  const { weather, error, views } = useHouseholds();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">가구 잔량</h1>
        <p className="mt-1 text-sm text-muted">
          생활지원사와 가족이 보는 화면입니다. 매일 새벽 기온과 예보로 집마다 남은 기름을 다시 계산합니다. 가구는 모두 가상입니다.
        </p>
        {weather && <WeatherNote fallback={weather.fallback} source={weather.source} />}
      </header>
      {!views ? <Loading error={error} /> : views.map((v) => <HouseCard key={v.h.id} v={v} today={weather!.today} />)}
      <RegisterCalc />
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className={`num text-right ${strong ? "font-bold" : ""}`}>{v}</span>
    </div>
  );
}

function HouseCard({ v, today }: { v: View; today: string }) {
  const { h, proj } = v;
  const lowK = v.params.k < REGION_MEDIAN_K / 2;
  const sinceEmpty = proj.emptyDate && proj.emptyDate <= today ? daysBetween(proj.emptyDate, today) : null;
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{h.label}</h2>
            <StatusBadge s={v.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {h.person} · {h.channel} · 주문 승인: {h.approval}
            {h.family ? ` · 가족: ${h.family}` : ""}
          </p>
          <p className="mt-2 max-w-2xl text-sm">{h.scenario}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/call?h=${h.id}`} className="btn btn-primary">
            {h.channel === "AI 스피커" ? "AI 스피커 안내" : "AI 전화"} 시연
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[1.6fr_1fr]">
        <LevelChart v={v} />
        <div>
          <Row k="오늘 남은 기름(추정)" v={fmtL(Math.max(0, proj.levelToday))} strong />
          <Row k="계산 시작" v={`${fmtDate(v.startDate)} · ${fmtL(v.startLevel)}`} />
          <Row
            k="집 계수"
            v={
              <>
                {v.params.k.toFixed(2)} L/난방도일
                {lowK && <span className="ml-1 text-check">(지역 중앙값 절반 미만)</span>}
              </>
            }
          />
          <Row k="먼저 전화하는 날" v={fmtDate(proj.alertDate)} />
          <Row
            k="예상 소진일"
            v={
              <>
                {fmtDate(proj.emptyDate)}
                {sinceEmpty != null && sinceEmpty > 0 && <span className="ml-1 text-empty">({sinceEmpty}일 지남)</span>}
              </>
            }
            strong
          />
          {proj.nextWeekCold && <Row k="한파 예보" v={<span className="text-[#3b82f6]">여유분 70L로 상향</span>} />}
          {v.shortfall && (
            <>
              <Row k={`남은 겨울 사용량 (~${fmtDate(v.shortfall.end)})`} v={fmtL(v.shortfall.liters)} />
              <Row k={`예상 비용 (리터 ${v.price.toLocaleString()}원)`} v={fmtWon(v.shortfall.cost)} />
              <Row k="바우처 잔액 (가상)" v={fmtWon(h.voucherLeft)} />
              <Row k="이번 겨울 모자랄 돈" v={<span className="text-empty">{fmtWon(v.shortfall.shortfall)}</span>} strong />
            </>
          )}
          <p className="mt-2 text-xs text-muted">{h.notes.join(" · ")}</p>
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
    <section className="card p-5">
      <h2 className="text-lg font-bold">새 가구 등록: 첫 겨울 집 계수 계산</h2>
      <p className="mt-1 text-sm text-muted">
        배달 기록이 없는 첫 겨울에는 등록할 때 &quot;지난겨울 기름을 몇 번, 한 번에 얼마나 넣으셨나요?&quot;를 물어 초기값을 정합니다.
        첫 배달 뒤부터는 실제 배달량으로 고칩니다.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4 text-sm">
        <label className="flex flex-col gap-1">
          지난겨울 넣은 횟수
          <input className="inp w-28" type="number" min={1} max={20} value={times} onChange={(e) => setTimes(+e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          한 번에 (L)
          <select className="inp w-32" value={each} onChange={(e) => setEach(+e.target.value)}>
            <option value={100}>100L (드럼 반)</option>
            <option value={200}>200L (드럼 하나)</option>
            <option value={300}>300L</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          기본 사용량 (L/일)
          <input className="inp w-28" type="number" step={0.1} min={0} value={base} onChange={(e) => setBase(+e.target.value)} />
        </label>
        <div className="card bg-accent-soft px-4 py-2">
          <div className="text-xs text-muted">집 계수 초기값</div>
          <div className="num text-xl font-bold">{k.toFixed(2)} L/난방도일</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        계산: (지난겨울 총량 {total.toLocaleString()}L − 기본 {base}L × 151일) ÷ 울주 평년 겨울 난방도일 {winterHdd.toLocaleString()}. 지역
        중앙값은 {REGION_MEDIAN_K}입니다. 이 값이 절반({REGION_MEDIAN_K / 2}) 밑이면 &quot;원래 적게 쓰는 집&quot;이 아니라 참는 집일 수 있어 살펴보기 대상에 넣습니다.
      </p>
      <button
        className="mt-3 text-xs text-muted underline"
        onClick={() =>
          update((s) => ({ ...s, kOverride: {}, gauges: {}, deliveries: {} }))
        }
      >
        A·B·C 가구 계수·눈금·배달 보정만 초기화
      </button>
    </section>
  );
}
