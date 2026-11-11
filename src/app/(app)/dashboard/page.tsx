"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Loading, Stat, StatusBadge, WeatherNote } from "@/components/ui";
import { useRegistry, View } from "@/lib/useModel";
import { EMDS, ELDERLY_SHARE_NOTE } from "@/data/ulju";
import { REGION_MEDIAN_K } from "@/data/households";
import { addDays, daysBetween, fmtDate, fmtL, fmtMan, fmtWon, isColdWave } from "@/lib/model";
import { STATIONS_AS_OF, ULJU_STATION_TOTAL, byEmd, cheapestIn, useStations } from "@/lib/stations";
import { State, update } from "@/lib/store";

type Tab = "welfare" | "energy";

// '살펴봐 주세요'에 보일 집. 생활지원사가 '해결'로 닫은 집은 목록과 숫자에서 뺀다
const needsLook = (v: View, checks: State["checks"]) =>
  (v.status === "check" || !!checks[v.h.id]) && checks[v.h.id] !== "해결";

export default function Dashboard() {
  const { weather, error, views, synth, store } = useRegistry();
  const [tab, setTab] = useState<Tab>("welfare");
  const st = useStations();

  const all = useMemo(() => (views && synth ? [...views, ...synth] : []), [views, synth]);

  const data = useMemo(() => {
    if (!weather || !all.length) return null;
    const today = weather.today;
    const week = addDays(today, 7);
    const coldDays: Record<string, string[]> = {};
    for (const e of EMDS) {
      const d = weather.byEmd[e.name] ?? [];
      const ti = d.findIndex((x) => x.date === today);
      coldDays[e.name] = d.slice(ti, ti + 7).flatMap((x, j) => (isColdWave(d, ti + j) ? [x.date] : []));
    }
    const perEmd = EMDS.map((e) => {
      const list = all.filter((v) => v.h.emd === e.name);
      const here = byEmd(st.stations, e.name);
      const low = cheapestIn(st.stations, e.name);
      return {
        e,
        list,
        callWeek: list.filter((v) => v.status === "call" || (v.status === "ok" && v.proj.alertDate && v.proj.alertDate <= week)).length,
        empty: list.filter((v) => v.status === "empty").length,
        check: list.filter((v) => needsLook(v, store.checks)).length,
        stations: here.length,
        minPrice: low ? low.kerosene : null,
        minSaved: st.live && !!low && !low.live, // 실시간 최저가 목록에 없어 저장 자료 가격을 쓴 읍면
        winterL: list.reduce((a, v) => a + (v.shortfall?.liters ?? 0), 0),
        winterCost: list.reduce((a, v) => a + (v.shortfall?.cost ?? 0), 0),
        cold: coldDays[e.name],
      };
    });
    const coldRisk = all.filter((v) => {
      if (!coldDays[v.h.emd]?.length) return false;
      const need = v.proj.points.filter((p) => p.date >= today && p.date < week).reduce((a, p) => a + p.use, 0);
      return v.proj.levelToday < need && v.status !== "ordered";
    });
    return { today, perEmd, coldRisk, coldDays };
  }, [weather, all, store.checks, st]);

  if (!weather || !data)
    return (
      <div className="page">
        <Loading error={error} />
      </div>
    );

  const lookList = all
    .filter((v) => needsLook(v, store.checks))
    .sort((a, b) => (a.h.id.length - b.h.id.length) || (a.proj.emptyDate ?? "").localeCompare(b.proj.emptyDate ?? ""));
  const noAnswer = store.logs.filter((l) => l.kind === "안부 확인 필요" || l.kind === "확인 필요");
  const shortTop = all
    .filter((v) => v.shortfall && v.shortfall.shortfall > 0)
    .sort((a, b) => b.shortfall!.shortfall - a.shortfall!.shortfall)
    .slice(0, 8);
  const anyCold = Object.values(data.coldDays).some((x) => x.length);

  return (
    <div className="page space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="page-title">울주군 현황판</h1>
          <p className="page-lead">
            복지 담당·생활지원사와 에너지 담당이 보는 화면입니다. 등록 가구 {all.length}곳 중 3곳은 시연 가구, 나머지는 가상 등록 가구입니다.
          </p>
          <WeatherNote fallback={weather.fallback} source={weather.source} />
        </div>
        <div className="flex">
          <button className={`btn ${tab === "welfare" ? "btn-primary" : ""}`} onClick={() => setTab("welfare")}>
            복지·안전
          </button>
          <button className={`btn ${tab === "energy" ? "btn-primary" : ""}`} onClick={() => setTab("energy")}>
            에너지 정책
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-y-8 md:grid-cols-5">
        <Stat label="등록 가구 (가상 포함)" value={`${all.length}`} sub="1순위 4개 면 중심" />
        <Stat
          label="이번 주 먼저 전화"
          value={`${data.perEmd.reduce((a, x) => a + x.callWeek, 0)}`}
          sub="알림일이 7일 안"
          tone="text-call"
        />
        <Stat label="소진 추정" value={`${data.perEmd.reduce((a, x) => a + x.empty, 0)}`} sub="소진일 지남, 7일 미만" tone="text-empty" />
        <Stat label="살펴봐 주세요" value={`${lookList.length}`} sub="소진 7일 지남·지원 요청" tone="text-check" />
        <Stat
          label="한파 예보 위험 가구"
          value={anyCold ? `${data.coldRisk.length}` : "0"}
          sub={anyCold ? "7일 안 한파, 잔량 < 7일 사용량" : "7일 안 한파 신호 없음"}
          tone="text-cold"
        />
      </section>

      {tab === "welfare" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <section className="card p-5">
              <h2 className="sec-title">읍면 개략도</h2>
              <p className="mt-1 text-xs text-muted">원 크기 = 65세 이상 인구, 진한 테두리 = 1순위. 숫자 = 이번 주 먼저 전화 / 살펴봐 주세요. 위치는 개략입니다.</p>
              <EmdMap rows={data.perEmd} />
            </section>
            <section className="card p-5">
              <h2 className="sec-title text-check">살펴봐 주세요</h2>
              <p className="mt-1 text-xs text-muted">
                판정이 아니라 방문 순서를 정하는 신호입니다. 예상 소진일 7일 뒤에도 주문이 없거나, 통화에서 기름값 부담을 말한 집입니다.
              </p>
              <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {lookList.map((v) => (
                  <LookItem key={v.h.id} v={v} today={data.today} state={store.checks[v.h.id]} />
                ))}
              </ul>
              {noAnswer.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <h3 className="sub-title">안부 확인 필요 (통화 기록)</h3>
                  <ul className="mt-1 space-y-1 text-xs">
                    {noAnswer.slice(0, 5).map((l) => (
                      <li key={l.id}>
                        <b>{l.hid} 가구</b> · {l.kind} · <span className="text-muted">{l.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <section className="card overflow-x-auto p-5">
            <h2 className="sec-title">읍면별 현황</h2>
            <table className="tbl mt-3">
              <thead>
                <tr>
                  <th>읍면</th>
                  <th>우선순위</th>
                  <th className="text-right">65세 이상</th>
                  <th className="text-right">80세 이상</th>
                  <th className="text-right">등록</th>
                  <th className="text-right">이번 주 전화</th>
                  <th className="text-right">살펴봐 주세요</th>
                  <th className="text-right">등유 주유소</th>
                  <th className="text-right">최저가</th>
                  <th>한파(7일)</th>
                </tr>
              </thead>
              <tbody className="num">
                {data.perEmd.map((r) => (
                  <tr key={r.e.name}>
                    <td className="whitespace-nowrap font-medium">
                      {r.e.name}
                      {ELDERLY_SHARE_NOTE[r.e.name] && <div className="text-[11px] font-normal text-muted">{ELDERLY_SHARE_NOTE[r.e.name]}</div>}
                    </td>
                    <td>{r.e.priority === 1 ? "1순위" : r.e.priority === 2 ? "2순위" : "—"}</td>
                    <td className="text-right">{r.e.elderly.toLocaleString()}</td>
                    <td className="text-right">
                      {r.e.age80.toLocaleString()} <span className="text-muted">({((r.e.age80 / r.e.elderly) * 100).toFixed(1)}%)</span>
                    </td>
                    <td className="text-right">{r.list.length}</td>
                    <td className="text-right text-call">{r.callWeek || ""}</td>
                    <td className="text-right text-check">{r.check || ""}</td>
                    <td className="text-right">{r.stations}</td>
                    <td className="whitespace-nowrap text-right">
                      {r.minPrice ? `${r.minPrice.toLocaleString()}원` : "—"}
                      {r.minSaved && <span className="text-muted">*</span>}
                    </td>
                    <td className="text-xs">{r.cold.length ? r.cold.map((d) => fmtDate(d).replace(/ \(.\)/, "")).join(", ") : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              노인 인구: 공공데이터포털 2025-08-20 · 주유소: {st.live ? `오피넷 실시간 ${st.asOf} (최저가 ${st.liveCount}곳${st.average ? `, 울주 평균 ${Math.round(st.average.price).toLocaleString()}원` : ""}) + 저장 자료 2026-09-19` : "오피넷 2026-09-19 저장 자료"}, 울주 {ULJU_STATION_TOTAL}곳 중 등유 가격이 있는 {st.stations.length}곳 ·
              한파 신호는 최저 -12℃ 이하 또는 하루 10℃ 넘는 급강하(단순화)
              {st.live && ` · 최저가의 *는 실시간 목록에 없어 ${STATIONS_AS_OF} 저장 가격을 쓴 읍면`}
            </p>
          </section>

          <section className="card overflow-x-auto p-5">
            <h2 className="sec-title">이번 겨울 본인 부담 비용이 큰 집</h2>
            <p className="mt-1 text-xs text-muted">남은 겨울 예상 사용량 × 오늘 가격 − 바우처 잔액. 긴급복지 연료비 같은 제도와 미리 잇는 데 씁니다.</p>
            <table className="tbl mt-3">
              <thead>
                <tr>
                  <th>가구</th>
                  <th className="text-right">남은 겨울 사용량</th>
                  <th className="text-right">예상 비용</th>
                  <th className="text-right">바우처 잔액</th>
                  <th className="text-right">본인 부담 비용</th>
                </tr>
              </thead>
              <tbody className="num whitespace-nowrap">
                {shortTop.map((v) => (
                  <tr key={v.h.id}>
                    <td>{v.h.label}</td>
                    <td className="text-right">{fmtL(v.shortfall!.liters)}</td>
                    <td className="text-right">{fmtMan(v.shortfall!.cost)}</td>
                    <td className="text-right">{fmtWon(v.h.voucherLeft)}</td>
                    <td className="text-right font-bold text-empty">{fmtMan(v.shortfall!.shortfall)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : (
        <EnergyTab rows={data.perEmd} />
      )}
    </div>
  );
}

function LookItem({ v, today, state }: { v: View; today: string; state?: "요청" | "방문 배정" | "해결" }) {
  const days = v.proj.emptyDate && v.proj.emptyDate <= today ? daysBetween(v.proj.emptyDate, today) : null;
  const demo = v.h.id.length === 1;
  return (
    <li className={`border p-4 text-sm ${demo ? "border-ink" : "border-line"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 font-semibold">
          {v.h.label} <StatusBadge s={v.status} />
        </div>
        <div className="flex gap-1">
          {state !== "방문 배정" && state !== "해결" && (
            <button className="btn !px-3 !py-2 text-xs" onClick={() => update((s) => ({ ...s, checks: { ...s.checks, [v.h.id]: "방문 배정" } }))}>
              방문 배정
            </button>
          )}
          {state !== "해결" && (
            <button className="btn !px-3 !py-2 text-xs" onClick={() => update((s) => ({ ...s, checks: { ...s.checks, [v.h.id]: "해결" } }))}>
              해결
            </button>
          )}
          {state && <span className="self-center text-xs font-semibold text-check">{state}</span>}
        </div>
      </div>
      <div className="mt-1 text-xs text-muted">
        {days != null && days > 0 ? `예상 소진일 ${fmtDate(v.proj.emptyDate)}에서 ${days}일 지남 · ` : ""}
        집 계수 {v.params.k.toFixed(2)}
        {v.params.k < REGION_MEDIAN_K / 2 ? " (가정한 지역 중앙값의 절반 미만)" : ""} · 바우처 잔액 {fmtWon(v.h.voucherLeft)}
        {demo && (
          <>
            {" · "}
            <Link className="text-accent underline" href={`/call?h=${v.h.id}`}>
              안부 전화 시연
            </Link>
          </>
        )}
      </div>
    </li>
  );
}

type Row = {
  e: (typeof EMDS)[number];
  list: View[];
  callWeek: number;
  check: number;
  winterL: number;
  winterCost: number;
};

function EmdMap({ rows }: { rows: Row[] }) {
  const W = 420,
    H = 340;
  const lats = EMDS.map((e) => e.lat),
    lons = EMDS.map((e) => e.lon);
  const [la0, la1, lo0, lo1] = [Math.min(...lats) - 0.04, Math.max(...lats) + 0.04, Math.min(...lons) - 0.05, Math.max(...lons) + 0.05];
  const x = (lon: number) => ((lon - lo0) / (lo1 - lo0)) * W;
  const y = (lat: number) => (1 - (lat - la0) / (la1 - la0)) * H;
  const maxE = Math.max(...EMDS.map((e) => e.elderly));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="울주군 읍면 개략도">
      <text x={8} y={16} fontSize="10" fill="var(--muted)">
        서부 산간 ←
      </text>
      <text x={W - 8} y={16} fontSize="10" textAnchor="end" fill="var(--muted)">
        → 동해안·공단
      </text>
      {rows.map((r) => {
        const rad = 10 + 22 * Math.sqrt(r.e.elderly / maxE);
        const cx = x(r.e.lon),
          cy = y(r.e.lat);
        return (
          <g key={r.e.name}>
            <circle
              cx={cx}
              cy={cy}
              r={rad}
              fill={r.e.priority === 1 ? "var(--accent-soft)" : "var(--bg)"}
              stroke={r.e.priority === 1 ? "var(--accent)" : r.e.priority === 2 ? "var(--call)" : "var(--line)"}
              strokeWidth={r.e.priority === 1 ? 2.5 : 1.5}
            />
            <text x={cx} y={cy - 2} fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--ink)">
              {r.e.name.replace(/[읍면]$/, "")}
            </text>
            {r.list.length > 0 && (
              <text x={cx} y={cy + 11} fontSize="10" textAnchor="middle" fill="var(--muted)">
                <tspan fill="var(--call)" fontWeight="700">
                  {r.callWeek}
                </tspan>
                {" / "}
                <tspan fill="var(--check)" fontWeight="700">
                  {r.check}
                </tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const MIN_HOMES = 10; // 에너지 정책 표에 넣는 읍면의 최소 등록 가구 수

function EnergyTab({ rows }: { rows: Row[] }) {
  // 등록 가구가 적은 읍면은 몇 집의 값에 평균이 흔들려 순위에 넣지 않는다(전에는 가상 가구 4곳인 읍이 맨 위에 왔다)
  const few = rows.filter((r) => r.list.length > 0 && r.list.length < MIN_HOMES);
  const sorted = rows.filter((r) => r.list.length >= MIN_HOMES).sort((a, b) => b.winterCost / b.list.length - a.winterCost / a.list.length);
  return (
    <section className="card overflow-x-auto p-5">
      <h2 className="sec-title">도시가스·LPG 배관 우선 마을 근거</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        울주군은 2030년까지 도시가스와 마을 LPG 소형저장탱크로 1,000세대를 바꿀 계획입니다(100억 원). 등유 안심에 쌓이는 배달 기록으로
        &quot;어느 마을이 기름값을 가장 많이 내나&quot;를 보여 줄 수 있습니다. 아래는 가상 등록 가구로 만든 예시입니다.
      </p>
      <table className="tbl mt-3">
        <thead>
          <tr>
            <th>읍면</th>
            <th className="text-right">등록 가구</th>
            <th className="text-right">남은 겨울 사용량 합</th>
            <th className="text-right">남은 겨울 등유값 합</th>
            <th className="text-right">가구당</th>
            <th className="text-right">65세 이상</th>
          </tr>
        </thead>
        <tbody className="num whitespace-nowrap">
          {sorted.map((r) => (
            <tr key={r.e.name}>
              <td className="font-medium">{r.e.name}</td>
              <td className="text-right">{r.list.length}</td>
              <td className="text-right">{fmtL(r.winterL)}</td>
              <td className="text-right">{fmtMan(r.winterCost)}</td>
              <td className="text-right font-bold">{fmtMan(r.winterCost / r.list.length)}</td>
              <td className="text-right">{r.e.elderly.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">
        실제 운영에서는 판매소가 입력한 배달량 합계를 씁니다. 지금 표는 모델 예측값입니다.
        {few.length > 0 && ` 등록 가구가 ${MIN_HOMES}곳 미만인 읍면 ${few.length}곳(${few.map((r) => r.e.name).join(", ")})은 평균이 흔들려 표에서 뺐습니다.`}
      </p>
    </section>
  );
}
