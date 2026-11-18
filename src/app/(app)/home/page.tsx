"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EMDS } from "@/data/ulju";
import type { HouseFacts } from "@/lib/ask";
import { KEROSENE_CAP, SUGGEST } from "@/lib/ask";
import { daysBetween, dailyUse, fmtDate, isColdWave } from "@/lib/model";
import { useStations } from "@/lib/stations";
import { addPriceRule, useStore } from "@/lib/store";
import { View, useHouseholds } from "@/lib/useModel";

// 등유 알리미 홈: 기름알리미처럼 "무엇이든 물어보세요"가 입구다.
// 질문은 /api/ask로 가고, 답 속 숫자는 서버가 오피넷 조회값·우리 집 계산값과 대조한 뒤 보여 준다.

type Reply = {
  answer: string;
  numbers: number;
  verified: boolean;
  source: "gemini" | "rule";
  note?: string;
  rule?: { price: number; emd: string };
  asOf: string;
};
type Msg = { who: "me"; text: string } | { who: "ai"; r: Reply } | { who: "err"; text: string };

// 우리 집 계산값을 챗봇이 쓸 사실로 바꾼다(숫자는 모두 모델 계산)
function houseFacts(v: View, today: string): HouseFacts {
  const { h, proj, days, todayIdx, params } = v;
  const sum = (from: number, to: number) => {
    let s = 0;
    for (let i = Math.max(0, from); i < Math.min(days.length, to); i++) s += dailyUse(params, days[i]);
    return s;
  };
  const level = Math.max(0, proj.levelToday);
  const coldDates: string[] = [];
  for (let i = todayIdx; i < Math.min(days.length, todayIdx + 7); i++) if (isColdWave(days, i)) coldDates.push(days[i].date);
  // 오늘부터 날마다 쓸 양. 이용자가 말한 바우처 금액으로 며칠 버틸지 서버가 셈한다(바우처 잔액은 보내지 않는다)
  const ahead = days.slice(todayIdx).map((d) => Math.round(dailyUse(params, d) * 10) / 10);
  return {
    today,
    label: h.label,
    emd: h.emd,
    tank: h.tank,
    level: Math.round(level * 10) / 10,
    emptyDate: proj.emptyDate,
    daysLeft: proj.emptyDate ? daysBetween(today, proj.emptyDate) : null,
    alertDate: proj.alertDate,
    use7: Math.round(sum(todayIdx, todayIdx + 7) * 10) / 10,
    usual7: Math.round(sum(todayIdx - 7, todayIdx) * 10) / 10,
    coldDates,
    dealer: h.dealer.replace(" (가상)", ""),
    dealerPrice: v.price,
    ahead,
  };
}

const diffWord = (d: number) => (d === 0 ? "어제와 같아요" : `어제보다 ${Math.abs(d).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}원 ${d > 0 ? "올랐어요" : "내렸어요"}`);

export default function AppHome() {
  const { weather, views } = useHouseholds();
  const st = useStations();
  const s = useStore();
  const [hid, setHid] = useState("A");
  const [emd, setEmd] = useState("상북면");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const v = views?.find((x) => x.h.id === hid) ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setMsgs((m) => [...m, { who: "me", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, emd, house: v && weather ? houseFacts(v, weather.today) : null }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const r = (await res.json()) as Reply;
      setMsgs((m) => [...m, { who: "ai", r }]);
    } catch {
      setMsgs((m) => [...m, { who: "err", text: "지금 답을 불러오지 못했어요. 잠시 뒤 다시 물어봐 주세요." }]);
    } finally {
      setBusy(false);
    }
  }

  const todo = views?.filter((x) => ["call", "empty", "check"].includes(x.status)).length ?? null;
  const coldEmd = weather?.byEmd[emd];
  const ti = coldEmd ? coldEmd.findIndex((d) => d.date === weather!.today) : -1;
  const cold = coldEmd && ti >= 0 ? coldEmd.slice(ti, ti + 7).filter((_, j) => isColdWave(coldEmd, ti + j)) : [];
  const chatting = msgs.length > 0;

  return (
    <div className="ask-page">
      {!chatting ? (
        <section className="ask-hero">
          <span className="app-orb ask-orb" aria-hidden="true" />
          <p className="mt-6 text-[15px] text-muted">
            {st.average
              ? `오늘 울주군 등유 평균은 ${st.average.price.toLocaleString("ko-KR")}원, ${diffWord(st.average.diff)}`
              : `울주군 주유소 등유 평균 ${Math.round(st.stations.reduce((a, x) => a + x.kerosene, 0) / Math.max(1, st.stations.length)).toLocaleString("ko-KR")}원 (오피넷 ${st.asOf} 자료)`}
          </p>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight md:text-[34px]">등유, 무엇이든 물어보세요</h1>
          <div className="mt-8 grid w-full grid-cols-2 gap-3 md:grid-cols-4">
            {SUGGEST.cards.map((q, i) => (
              <button key={q} className="ask-card" onClick={() => ask(q)}>
                <CardIcon i={i} />
                <span>{q}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SUGGEST.chips.map((q) => (
              <button key={q} className="ask-chip" onClick={() => ask(q)}>
                {q}
              </button>
            ))}
          </div>

          <section className="ask-news" aria-label="오늘의 등유 소식">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="text-[15px] font-semibold">오늘의 등유 소식</h2>
              <span className="text-[12px] text-muted">{st.live ? `오피넷 ${st.asOf}` : `오피넷 ${st.asOf} 저장 자료`}</span>
            </div>
            <dl className="grid gap-px bg-line sm:grid-cols-2">
              <News k="울주군 등유 평균" v={st.average ? `${st.average.price.toLocaleString("ko-KR")}원` : "—"} s={st.average ? diffWord(st.average.diff) : "실시간 가격을 불러오지 못함"} />
              <News k="전국 등유 평균" v={st.national ? `${st.national.price.toLocaleString("ko-KR")}원` : "—"} s={st.national ? diffWord(st.national.diff) : "—"} />
              <News
                k={`${emd} 앞으로 7일 한파`}
                v={cold.length ? `${cold.length}일` : "없음"}
                s={cold.length ? cold.map((d) => fmtDate(d.date)).join(", ") : "한파 신호가 없어요"}
              />
              <News k="석유 최고가격(등유)" v={`${KEROSENE_CAP.price.toLocaleString("ko-KR")}원`} s={`정유사 공급가 상한, ${KEROSENE_CAP.note}`} />
            </dl>
            <Link href="/households" className="block border-t border-line px-5 py-3 text-[14px] hover:bg-mist">
              {todo == null ? "시연 가구를 계산하고 있어요" : todo > 0 ? `오늘 챙길 집 ${todo}곳 보기` : "오늘은 챙길 집이 없어요"}
            </Link>
          </section>
        </section>
      ) : (
        <section className="ask-thread" aria-live="polite">
          {msgs.map((m, i) =>
            m.who === "me" ? (
              <p key={i} className="ask-me">
                {m.text}
              </p>
            ) : m.who === "err" ? (
              <p key={i} className="ask-ai text-muted">
                {m.text}
              </p>
            ) : (
              <Answer key={i} r={m.r} saved={!!m.r.rule && (s.priceRules ?? []).some((x) => x.emd === m.r.rule!.emd && x.price === m.r.rule!.price)} />
            ),
          )}
          {busy && (
            <div className="ask-ai" aria-label="답을 쓰는 중">
              <i className="ask-skel w-4/5" />
              <i className="ask-skel w-3/5" />
              <i className="ask-skel w-2/5" />
            </div>
          )}
          <div ref={endRef} />
        </section>
      )}

      <div className="ask-dock">
        <div className="flex flex-wrap items-center gap-2">
          <label className="ask-pick">
            <span className="sr-only">우리 집</span>
            <select
              value={hid}
              onChange={(e) => {
                setHid(e.target.value);
                const nv = views?.find((x) => x.h.id === e.target.value);
                if (nv) setEmd(nv.h.emd);
              }}
            >
              {(views ?? []).map((x) => (
                <option key={x.h.id} value={x.h.id}>
                  우리 집: {x.h.label}
                </option>
              ))}
              <option value="">집 고르지 않음</option>
            </select>
          </label>
          <label className="ask-pick">
            <span className="sr-only">읍면</span>
            <select value={emd} onChange={(e) => setEmd(e.target.value)}>
              {EMDS.map((e) => (
                <option key={e.name}>{e.name}</option>
              ))}
            </select>
          </label>
        </div>
        {chatting && (
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {[...SUGGEST.cards, ...SUGGEST.chips].map((q) => (
              <button key={q} className="ask-chip shrink-0" onClick={() => ask(q)} disabled={busy}>
                {q}
              </button>
            ))}
          </div>
        )}
        <form
          className="ask-input"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 두서면 등유 제일 싼 곳 어디야?"
            aria-label="질문"
            maxLength={300}
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="보내기" className="ask-send">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function Answer({ r, saved }: { r: Reply; saved: boolean }) {
  return (
    <div>
      <div className="ask-ai">
        {r.answer.split(/\n+/).map((t, i) => (
          <p key={i}>{t}</p>
        ))}
        {r.rule && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-mist px-3 py-2 text-[14px]">
            <span>
              {r.rule.emd} 등유가 리터에 {r.rule.price.toLocaleString("ko-KR")}원 밑으로 내려가면 알림
            </span>
            {saved ? (
              <Link href="/alerts" className="ml-auto font-semibold underline underline-offset-4">
                저장했어요 · 알림 탭에서 보기
              </Link>
            ) : (
              <button className="btn btn-primary ml-auto !px-4 !py-1.5 !text-[13px]" onClick={() => addPriceRule(r.rule!.emd, r.rule!.price)}>
                조건 저장
              </button>
            )}
          </div>
        )}
      </div>
      <p className="ask-badge">
        {r.numbers > 0 ? (r.verified ? `숫자 ${r.numbers}개 · 조회·계산 값과 대조해 일치` : `숫자 ${r.numbers}개 · 대조하지 못함`) : "숫자 없음"}
        {" · "}
        {r.source === "gemini" ? "Gemini가 씀" : "정해 둔 문장"}
      </p>
    </div>
  );
}

function News({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-[13px] text-muted">{k}</dt>
      <dd className="num mt-1 text-[22px] font-semibold">{v}</dd>
      <dd className="mt-0.5 text-[13px] text-muted">{s}</dd>
    </div>
  );
}

// 카드 아이콘: 위치, 탱크, 눈송이, 지갑 (주황 선)
function CardIcon({ i }: { i: number }) {
  const paths = [
    <path key="0" d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
    <g key="1">
      <rect x="6" y="3.5" width="12" height="17" rx="3" />
      <path d="M6 14h12" />
    </g>,
    <path key="2" d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />,
    <g key="3">
      <rect x="3.5" y="6.5" width="17" height="12" rx="2.5" />
      <path d="M3.5 10h17M15.5 14.5h2" />
    </g>,
  ];
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-fuel" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[i]}
    </svg>
  );
}
