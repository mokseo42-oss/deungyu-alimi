"use client";
import { useEffect, useState } from "react";
import { Loading } from "@/components/ui";
import { EMDS } from "@/data/ulju";
import { BtOptions, DEFAULT_OPTS, HouseResult, MIN_DELIVERY, Summary, median, quantile, runBacktest } from "@/lib/backtest";
import type { Day } from "@/lib/model";

// 검증 화면: 울주 지난 겨울의 실제 기온으로 하루씩 되돌려 보며, 기름이 떨어지기 전에 배달됐는지 채점한다.
// 계산은 모두 이 브라우저에서 한다(lib/backtest.ts).

type History = { season: { from: string; to: string }; source?: string; error?: string; byEmd: Record<string, Day[]> };

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : "—");
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export default function VerifyPage() {
  const [hist, setHist] = useState<History | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [emd, setEmd] = useState("두서면");
  const [opts, setOpts] = useState<BtOptions>({ ...DEFAULT_OPTS, households: 100 });
  const [result, setResult] = useState<ReturnType<typeof runBacktest> | null>(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(0);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((j: History) => (j.error ? setErr(j.error) : setHist(j)), (e) => setErr(String(e)));
  }, []);

  const days = hist?.byEmd[emd];
  useEffect(() => {
    if (!days?.length) return;
    setBusy(true);
    // 계산(1초 안팎) 전에 '계산 중'이 먼저 그려지게 한 박자 쉰다
    const t = window.setTimeout(() => {
      setResult(runBacktest(days, opts));
      setBusy(false);
    }, 30);
    return () => window.clearTimeout(t);
  }, [days, opts]);

  if (!hist) return <Loading error={err} />;
  const set = (p: Partial<BtOptions>) => setOpts((o) => ({ ...o, ...p }));

  return (
    <div className="page space-y-10">
      <header>
        <h1 className="page-title">지난 겨울로 되돌려 보기</h1>
        <p className="page-lead">
          울주 {emd}의 지난 겨울({md(hist.season.from)}~{md(hist.season.to)}) 실제 기온 위에 가상 가구 {opts.households}집을 얹고, 하루씩
          넘기며 예측 → 전화 → 배달 → 배우기를 되풀이했습니다. 모델은 가구가 실제로 얼마나 쓰는지 모르는 채로 시작합니다. 기름이
          떨어지기 전에 배달됐는지로 채점합니다.
        </p>
        <p className="mt-2 text-[13px] text-muted">기온: {hist.source}. 계산은 이 브라우저에서 합니다.</p>
      </header>

      <section className="card flex flex-wrap items-end gap-x-6 gap-y-4 p-5" aria-label="조건">
        <Field label="읍면 기온">
          <select className="inp" value={emd} onChange={(e) => setEmd(e.target.value)}>
            {EMDS.map((e) => (
              <option key={e.name}>{e.name}</option>
            ))}
          </select>
        </Field>
        <Field label="하루 사용량 흔들림">
          <Seg
            value={opts.noise}
            options={[
              [0.2, "±20%"],
              [0.35, "±35%"],
              [0.5, "±50%"],
            ]}
            onChange={(v) => set({ noise: v })}
          />
        </Field>
        <Field label="전화 뒤 배달까지">
          <Seg
            value={opts.delayMax}
            options={[
              [3, "1~3일"],
              [5, "3~5일"],
            ]}
            onChange={(v) => set({ delayMin: v === 3 ? 1 : 3, delayMax: v })}
          />
        </Field>
        <Field label="가입 때 지난겨울 사용량">
          <Seg
            value={opts.registration ? 1 : 0}
            options={[
              [1, "물음"],
              [0, "안 물음(모두 0.5)"],
            ]}
            onChange={(v) => set({ registration: v === 1 })}
          />
        </Field>
        <button className="btn" onClick={() => set({ seed: opts.seed + 1 })}>
          다른 가구로 다시
        </button>
        {busy && <span className="text-[14px] text-muted">계산 중…</span>}
      </section>

      {!result ? (
        <Loading />
      ) : (
        <>
          <Scores m={result.sModel} f={result.sFlat} />
          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="sec-title">한 집의 겨울</h2>
              <select className="inp" value={pick} onChange={(e) => setPick(Number(e.target.value))}>
                {result.model.slice(0, 30).map((h, i) => (
                  <option key={h.truth.id} value={i}>
                    {h.truth.label}
                  </option>
                ))}
              </select>
            </div>
            <HouseChart h={result.model[pick]} flat={result.flat[pick]} />
          </section>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-6">
              <h2 className="sec-title">전화한 날, 기름이 실제로 며칠 치 남아 있었나</h2>
              <p className="mt-1 text-[14px] text-muted">
                0에 가까울수록 아슬아슬했던 것, 너무 크면 일찍 건 것입니다. 배달까지 1~3일이 걸리니 3일보다는 커야 합니다.
              </p>
              <LeadChart m={result.sModel.leadDays} f={result.sFlat.leadDays} />
            </section>
            <section className="card p-6">
              <h2 className="sec-title">배달이 쌓일수록 집 계수가 맞아지나</h2>
              <p className="mt-1 text-[14px] text-muted">그 집이 기온에 따라 쓰는 양(집 계수)을 진짜 값과 비교한 오차의 중앙값.</p>
              <LearnChart m={result.sModel} f={result.sFlat} />
            </section>
          </div>
          <Limits />
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
      {label}
      {children}
    </label>
  );
}

function Seg<T extends number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <span className="inline-flex rounded-full bg-white p-1">
      {options.map(([v, l]) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={v === value}
          className={`rounded-full px-3 py-1 text-[14px] ${v === value ? "bg-ink font-semibold text-white" : "text-ink"}`}
        >
          {l}
        </button>
      ))}
    </span>
  );
}

function Scores({ m, f }: { m: Summary; f: Summary }) {
  const lead = m.leadDays;
  const k0 = median(m.kErrByDelivery[0] ?? []);
  const k3 = median(m.kErrByDelivery[3] ?? []);
  const items = [
    {
      l: "기름이 떨어지기 전에 배달된 비율",
      v: pct(m.onTime, m.deliveries),
      s: `기온을 보지 않고 하루 평균으로만 재면 ${pct(f.onTime, f.deliveries)}`,
    },
    {
      l: "겨울 동안 한 번이라도 바닥난 집",
      v: `${m.ranOutHouses}집`,
      s: `${m.houses}집 중. 하루 평균 방식은 ${f.ranOutHouses}집, 바닥난 날 합계 ${f.dryDays.toLocaleString()}일(우리 ${m.dryDays}일)`,
    },
    {
      l: "전화한 날 남아 있던 기름",
      v: `${median(lead)}일 치`,
      s: `중앙값. 하위 10%는 ${quantile(lead, 0.1)}일 치, 가장 적을 때 ${Math.min(...lead)}일 치`,
    },
    {
      l: "집 계수 오차",
      v: `${Math.round(k0 * 100)}% → ${Math.round(k3 * 100)}%`,
      s: "처음 → 배달 세 번 뒤(중앙값)",
    },
  ];
  return (
    <section aria-label="채점" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((x) => (
        <div key={x.l} className="card p-5">
          <p className="text-[14px] font-medium">{x.l}</p>
          <p className="num mt-3 text-[30px] font-light leading-tight">{x.v}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{x.s}</p>
        </div>
      ))}
      <p className="text-[13px] text-muted sm:col-span-2 lg:col-span-4">
        배달 {m.deliveries.toLocaleString()}번, 판매소가 갔는데 넣을 자리가 {MIN_DELIVERY}L도 안 돼 눈금만 보고 돌아온 경우{" "}
        {m.skips.toLocaleString()}번({pct(m.skips, m.skips + m.deliveries)}). 한 집에 겨울 동안 평균{" "}
        {(m.deliveries / m.houses).toFixed(1)}번 배달.
      </p>
    </section>
  );
}

const CW = 720;
const CH = 230;
const PAD = { l: 34, r: 8, t: 10, b: 52 };

function HouseChart({ h, flat }: { h: HouseResult; flat: HouseResult }) {
  const s = h.series;
  const n = s.length;
  const tank = h.truth.tank;
  const x = (i: number) => PAD.l + (i / (n - 1)) * (CW - PAD.l - PAD.r);
  const plotH = CH - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + (1 - v / tank) * plotH;
  const line = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const months = s.flatMap((p, i) => (p.date.endsWith("-01") ? [{ i, m: Number(p.date.slice(5, 7)) }] : []));
  const tmin = Math.min(...s.map((p) => p.tmean));
  const tmax = Math.max(...s.map((p) => p.tmean));
  const ty = (t: number) => CH - 30 + ((tmax - t) / (tmax - tmin || 1)) * 24;
  const dryM = h.series.filter((p) => p.trueLevel <= 0).length;
  const dryF = flat.series.filter((p) => p.trueLevel <= 0).length;
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" role="img" aria-label={`${h.truth.label}의 지난 겨울 실제 잔량과 모델이 생각한 잔량`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={CW - PAD.r} y1={y(tank * f)} y2={y(tank * f)} stroke="var(--line)" />
            <text x={PAD.l - 6} y={y(tank * f) + 4} fontSize="10" textAnchor="end" fill="var(--muted)">
              {tank * f}L
            </text>
          </g>
        ))}
        {months.map(({ i, m }) => (
          <text key={i} x={x(i) + 2} y={CH - 36} fontSize="10" fill="var(--muted)">
            {m}월
          </text>
        ))}
        <path d={s.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${ty(p.tmean).toFixed(1)}`).join("")} fill="none" stroke="var(--cold)" strokeOpacity="0.5" />
        <text x={PAD.l - 6} y={CH - 16} fontSize="10" textAnchor="end" fill="var(--muted)">
          기온
        </text>
        <path d={line(flat.series.map((p) => p.trueLevel))} fill="none" stroke="#b9bdc6" strokeWidth="1.2" />
        <path d={line(s.map((p) => p.trueLevel))} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
        <path d={line(s.map((p) => p.modelLevel))} fill="none" stroke="var(--fuel)" strokeWidth="1.6" strokeDasharray="4 3" />
        {s.map((p, i) =>
          p.call ? <circle key={`c${i}`} cx={x(i)} cy={y(p.trueLevel)} r="3.2" fill="var(--fuel)" /> : null,
        )}
        {s.map((p, i) =>
          p.trueLevel <= 0 ? <rect key={`d${i}`} x={x(i) - 1.5} y={y(0) - 4} width="3" height="4" fill="var(--empty)" /> : null,
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
        <span className="flex items-center gap-2">
          <i className="w-5 border-t-2 border-ink" /> 실제 잔량
        </span>
        <span className="flex items-center gap-2">
          <i className="w-5 border-t-2 border-dashed border-fuel" /> 모델이 생각한 잔량
        </span>
        <span className="flex items-center gap-2">
          <i className="size-2 rounded-full bg-fuel" /> 전화한 날
        </span>
        <span className="flex items-center gap-2">
          <i className="w-5 border-t-2 border-[#b9bdc6]" /> 기온을 안 보는 방식이었다면
        </span>
        <span>
          진짜 집 계수 {h.truth.k} · {h.truth.half ? "반 드럼씩 삼" : "가득 채움"} · 배달 {h.deliveries.length}번 · 바닥난 날 {dryM}일
          (기온 안 보는 방식 {dryF}일)
        </span>
      </figcaption>
    </figure>
  );
}

function LeadChart({ m, f }: { m: number[]; f: number[] }) {
  const max = 25;
  const bins = (xs: number[]) => {
    const b = Array(max + 2).fill(0);
    xs.forEach((v) => b[Math.max(0, Math.min(max + 1, v))]++);
    return b.map((c) => c / Math.max(1, xs.length));
  };
  const bm = bins(m);
  const bf = bins(f);
  const top = Math.max(...bm, ...bf);
  const W = 520;
  const H = 170;
  const bw = W / (max + 2);
  const y = (v: number) => H - 22 - (v / top) * (H - 34);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="전화한 날 남아 있던 날수의 분포">
      <rect x={0} y={8} width={bw * 3} height={H - 30} fill="var(--empty)" opacity="0.07" />
      {bm.map((v, i) => (
        <rect key={i} x={i * bw + 1} y={y(v)} width={bw - 2} height={H - 22 - y(v)} fill="var(--fuel)" />
      ))}
      <path d={bf.map((v, i) => `${i ? "L" : "M"}${(i + 0.5) * bw},${y(v)}`).join("")} fill="none" stroke="var(--ink)" strokeWidth="1.4" />
      {[0, 3, 7, 14, 21].map((d) => (
        <text key={d} x={(d + 0.5) * bw} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">
          {d}일
        </text>
      ))}
      <text x={(max + 1.5) * bw} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">
        25+
      </text>
      <text x={bw * 1.5} y={20} fontSize="10" textAnchor="middle" fill="var(--empty)">
        아슬아슬
      </text>
      <text x={W - 4} y={20} fontSize="11" textAnchor="end" fill="var(--muted)">
        막대: 우리 방식 · 선: 기온 안 보는 방식
      </text>
    </svg>
  );
}

function LearnChart({ m, f }: { m: Summary; f: Summary }) {
  const N = 7;
  const mm = Array.from({ length: N }, (_, i) => median(m.kErrByDelivery[i] ?? []));
  const ff = Array.from({ length: N }, (_, i) => median(f.kErrByDelivery[i] ?? []));
  const W = 520;
  const H = 170;
  const top = Math.max(0.6, ...mm.filter(Number.isFinite), ...ff.filter(Number.isFinite));
  const x = (i: number) => 36 + (i / (N - 1)) * (W - 50);
  const y = (v: number) => 10 + (1 - v / top) * (H - 36);
  const line = (vals: number[]) => vals.map((v, i) => (Number.isFinite(v) ? `${i ? "L" : "M"}${x(i)},${y(v)}` : "")).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="배달 횟수에 따른 집 계수 오차">
      {[0, 0.2, 0.4].map((v) => (
        <g key={v}>
          <line x1={36} x2={W - 14} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={30} y={y(v) + 4} fontSize="10" textAnchor="end" fill="var(--muted)">
            {v * 100}%
          </text>
        </g>
      ))}
      <path d={line(ff)} fill="none" stroke="var(--ink)" strokeWidth="1.4" />
      <path d={line(mm)} fill="none" stroke="var(--fuel)" strokeWidth="2.2" />
      {mm.map((v, i) => (Number.isFinite(v) ? <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--fuel)" /> : null))}
      {mm.map((_, i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">
          {i === 0 ? "처음" : `${i}번`}
        </text>
      ))}
      <text x={W - 14} y={18} fontSize="11" textAnchor="end" fill="var(--muted)">
        주황: 우리 방식 · 검정: 기온 안 보는 방식
      </text>
    </svg>
  );
}

function Limits() {
  const items = [
    "가구는 가상입니다. 진짜 사용량을 '기온 공식 × 날마다 흔들림'으로 만들었기 때문에 기온을 보는 우리 방식에 유리합니다. 실제 가구 기록으로 다시 재야 합니다.",
    "담지 못한 것: 난방을 갑자기 참기 시작한 집, 집을 비운 기간, 다른 데서 산 기름, 전화를 안 받는 경우, 판매소가 바빠 배달이 늦어지는 한파 주간.",
    "모델은 앞 7일은 실제 기온에 예보 오차(±1.5℃)를 더한 값, 그 뒤는 예년 평균만 봅니다. 실제 예보보다 조금 좋거나 나쁠 수 있습니다.",
    "판매소가 배달 때 눈금을 네 칸 단위로 본다고 두었습니다. 반 드럼씩 사는 집은 이 눈금으로만 배웁니다.",
    "추운 마을에서는 전화와 배달이 생각보다 자주 갑니다(위 '평균 배달' 숫자). 200L 탱크에 '7일 쓸 양 + 50L' 기준이면 탱크 절반쯤에서 전화가 가기 때문입니다. 탱크가 큰 집이나 기준을 조정하는 실험이 다음 과제입니다.",
  ];
  return (
    <section className="card p-6">
      <h2 className="sec-title">이 결과를 읽을 때</h2>
      <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-muted" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
