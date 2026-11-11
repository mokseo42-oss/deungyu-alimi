"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loading, StatusBadge } from "@/components/ui";
import { useHouseholds, View, suggestLiters } from "@/lib/useModel";
import { fmtDate, fmtL, fmtWon, learnK, project } from "@/lib/model";
import { CONFUSED_SAMPLE, Intent, QUICK, REASK, Stage, understand } from "@/lib/dialog";
import { addFamily, addLog, nowISO, uid, update, useStore } from "@/lib/store";
import { STATIONS_AS_OF, cheapestIn, useStations } from "@/lib/stations";

type Msg = { who: "ai" | "me" | "sys"; text: string };

function useEngine() {
  const [e, setE] = useState<{ engine: string; model: string | null } | null>(null);
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then(setE, () => setE({ engine: "rule", model: null }));
  }, []);
  return e;
}

export default function CallPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CallInner />
    </Suspense>
  );
}

function CallInner() {
  const params = useSearchParams();
  const router = useRouter();
  const hid = params.get("h") ?? "A";
  const { weather, error, views } = useHouseholds();
  const v = views?.find((x) => x.h.id === hid);
  return (
    <div className="page space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="page-title">AI 전화</h1>
          <p className="page-lead">
            어르신 창구는 화면이 아니라 음성입니다. 어르신 말은 생성형 AI(Gemini)가 알아듣고, 숫자는 모델이 계산합니다. AI 문장에
            모델에 없는 숫자가 섞이면 버립니다. 실제 전화망 연결은 하지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(views ?? []).map((x) => (
            <button
              key={x.h.id}
              onClick={() => router.replace(`/call?h=${x.h.id}`)}
              className={`btn ${x.h.id === hid ? "btn-primary" : ""}`}
            >
              {x.h.label}
            </button>
          ))}
        </div>
      </header>
      {!v || !weather ? <Loading error={error} /> : <CallSim key={v.h.id} v={v} today={weather.today} />}
    </div>
  );
}

function speak(text: string, on: boolean) {
  if (!on || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  // 화면에는 "11월 27일 (금)", 읽을 때는 "11월 27일 금요일"
  const u = new SpeechSynthesisUtterance(text.replace(/\((일|월|화|수|목|금|토)\)/g, "$1요일"));
  u.lang = "ko-KR";
  u.rate = 0.95;
  const ko = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("ko"));
  if (ko) u.voice = ko;
  window.speechSynthesis.speak(u);
}

const HONOR: Record<string, string> = { 딸: "따님", 아들: "아드님" };

function CallSim({ v: live, today }: { v: View; today: string }) {
  const s = useStore();
  const [snap, setSnap] = useState<View>(live); // 통화 중에는 시작 때 숫자로 고정
  const v = snap;
  const h = v.h;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [miss, setMiss] = useState(0);
  const [level, setLevel] = useState(Math.max(0, v.proj.levelToday));
  const [liters, setLiters] = useState(suggestLiters(h.tank, v.proj.levelToday));
  const [input, setInput] = useState("");
  const [tts, setTts] = useState(true);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastSrc, setLastSrc] = useState<{ source: string; note?: string; intent?: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<string | null>(null); // LLM 공감 한마디를 다음 AI 말 앞에 붙임
  const engine = useEngine();
  const st = useStations();
  const cheap = cheapestIn(st.stations, h.emd);
  const cheapLive = !!cheap?.live;
  const asOf = cheapLive ? st.asOf : STATIONS_AS_OF;
  const rel = h.family?.split(" ")[0];
  const who = rel ? (HONOR[rel] ?? `${rel}님`) : "생활지원사 선생님";
  const dealer = h.dealer.replace(" (가상)", ""); // 말과 가족 알림에는 '(가상)' 표시를 뺀다

  useEffect(() => {
    if (stage === "idle") setSnap(live);
  }, [live, stage]);
  useEffect(() => {
    // 최신 크롬은 scrollIntoView가 Promise를 돌려주므로 effect에서 값을 반환하지 않게 감쌈
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs]);

  const ai = (raw: string) => {
    const text = leadRef.current ? `${leadRef.current} ${raw}` : raw;
    leadRef.current = null;
    setMsgs((m) => [...m, { who: "ai", text }]);
    speak(text, tts);
  };
  const sys = (text: string) => setMsgs((m) => [...m, { who: "sys", text }]);

  function start() {
    window.speechSynthesis?.cancel();
    setSnap(live);
    setMsgs([]);
    setMiss(0);
    const p = live.proj;
    const hello =
      h.channel === "AI 스피커"
        ? "어르신, 안녕하세요. 등유 안심 AI예요. 저는 사람이 아니라 인공지능이에요."
        : "어르신, 안녕하세요. 울주군 등유 안심 AI입니다. 이 전화는 인공지능이 걸었어요.";
    sys(h.channel === "AI 스피커" ? "AI 스피커가 말을 겁니다" : `${fmtDate(today)} 오전 10시, 전화가 옵니다`);
    if (live.orderId) {
      ai(`${hello} 주문하신 기름은 ${dealer}에서 처리하고 있어요. 곧 연락드릴 거예요.`);
      setStage("done");
      return;
    }
    if (live.status === "check") {
      // 통화에서 눈금 답으로 잔량이 고쳐져도, 생활지원사가 '해결'로 닫을 때까지 '살펴봐 주세요'에 남긴다
      update((st) => ({ ...st, checks: { ...st.checks, [h.id]: st.checks[h.id] ?? "요청" } }));
      ai(
        `${hello} 지난번 넣으신 기름이 ${fmtDate(p.emptyDate)}쯤 다 됐을 것 같은데, 아직 주문이 없으셔서 안부 겸 전화드렸어요. 요즘 보일러는 잘 돌리고 계세요?`,
      );
      setStage("checkin");
      return;
    }
    const cold = p.nextWeekCold ? "이번 주 한파 예보가 있어서 " : "날이 추워지면서 ";
    if (live.status === "ok") {
      ai(`${hello} 계산으로는 기름이 아직 넉넉해요. ${fmtDate(p.emptyDate)}쯤까지는 쓰실 것 같아요. 혹시 탱크 눈금은 어디쯤인가요?`);
    } else {
      ai(`${hello} ${cold}보일러 기름이 ${fmtDate(p.emptyDate)}쯤 떨어질 것 같아요. 탱크 눈금이 지금 어디쯤인가요?`);
    }
    setStage("gauge");
  }

  function noAnswer() {
    window.speechSynthesis?.cancel();
    setMsgs([]);
    sys("전화를 받지 않으셨습니다. 3시간 뒤 다시 걸었지만 받지 않으셨습니다.");
    sys(`두 번 연속 무응답 → ${h.family ?? "가족 없음"}과 생활지원사에게 알림`);
    addLog(h.id, "안부 확인 필요", "AI 전화 두 번 무응답");
    if (h.family) addFamily(h.id, `[등유 안심] 오늘 부모님(${h.label})께 두 번 전화드렸지만 받지 않으셨어요. 안부 확인 부탁드려요.`);
    update((st) => ({ ...st, checks: { ...st.checks, [h.id]: st.checks[h.id] ?? "요청" } }));
    setStage("done");
  }

  function handoff() {
    ai(`제가 잘 이해하지 못했어요. 주문은 넣지 않고, ${who}께 확인을 부탁드릴게요. 좋은 하루 보내세요.`);
    sys("대화가 맞지 않음 → 주문하지 않음. 가족·생활지원사에게 넘김");
    addLog(h.id, "확인 필요", "대화가 맞지 않아 주문하지 않음");
    if (h.family) addFamily(h.id, `[등유 안심] 부모님(${h.label})과 통화했는데 대화가 잘 이어지지 않았어요. 한번 연락해 봐 주세요. 주문은 넣지 않았습니다.`);
    setStage("done");
  }

  // sorry=false: 말은 알아들었지만 필요한 답이 아닐 때("아직 많아"). 사과 없이 다시 묻는다
  function miss1(prompt: string, sorry = true) {
    if (miss + 1 >= 2) return handoff();
    setMiss(miss + 1);
    ai(sorry ? `죄송해요, 제가 잘 못 알아들었어요. ${prompt}` : prompt);
  }

  function moneyFlow() {
    ai(
      `기름값이 부담되시지요. 등유를 쓰시는 바우처 가구는 등유 추가지원이 있어요. 지금 바우처 잔액은 ${fmtWon(h.voucherLeft)}으로 보여요. 생활지원사 선생님께 연결해 드릴까요? 원하지 않으시면 연결하지 않아요.`,
    );
    setStage("money");
  }

  function offer(L: number, lv: number) {
    setLiters(L);
    const amount = L * v.price;
    const cheapTxt = cheap
      ? ` 참고로 ${h.emd} 주유소 중 등유가 가장 싼 곳은 리터에 ${cheap.kerosene.toLocaleString()}원이에요. ${cheapLive ? "오늘" : `${Number(asOf.slice(5, 7))}월 ${Number(asOf.slice(8, 10))}일`} 오피넷 기준이고 배달 여부는 따로 확인해야 해요.`
      : "";
    ai(
      `늘 시키시던 ${dealer} 오늘 가격이 리터에 ${v.price.toLocaleString()}원이에요. ${L}리터면 ${fmtWon(amount)}입니다.${cheapTxt} 주문해 드릴까요?`,
    );
    setLevel(lv);
    setStage("offer");
  }

  function placeOrder() {
    const id = uid();
    const needFamily = h.approval === "가족 승인";
    update((st) => ({
      ...st,
      orders: [
        {
          id,
          hid: h.id,
          liters,
          price: v.price,
          dealer: h.dealer,
          via: h.channel,
          createdAt: nowISO(),
          status: needFamily ? "가족 승인 대기" : "접수",
        },
        ...st.orders,
      ],
    }));
    addLog(h.id, "주문", `${liters}L · ${fmtWon(liters * v.price)} · ${h.dealer}${needFamily ? " (가족 승인 대기)" : ""}`);
    if (needFamily) {
      addFamily(
        h.id,
        `[등유 안심] 부모님(${h.label})께서 등유 ${liters}L(${fmtWon(liters * v.price)}) 주문을 원하세요. 승인하시면 ${dealer}에 전달됩니다.`,
        id,
      );
      ai(`${who}께 승인 요청을 보냈어요. 승인되면 상회에서 확인 전화를 드릴 거예요. 값은 배달 오면 그때 카드나 국민행복카드로 내시면 됩니다. 저는 돈이나 카드 번호를 절대 묻지 않아요.`);
    } else {
      if (h.family) addFamily(h.id, `[등유 안심] 오늘 부모님 댁 등유 ${liters}L 주문, 1~3일 안에 배달 예정입니다. (${dealer})`, id);
      ai(`${liters}리터 주문 넣었습니다. 상회에서 확인 전화를 드릴 거예요. 값은 배달 오면 그때 카드나 국민행복카드로 내시면 됩니다. 저는 돈이나 카드 번호를 절대 묻지 않아요.`);
    }
    sys(needFamily ? "주문 → 가족 승인 대기 (카카오톡)" : "주문 → 판매소 화면으로 전달");
    setStage("done");
  }

  function gaugeStep(it: Intent) {
    if (it.t === "money") return moneyFlow();
    if (it.t === "plenty") return miss1("넉넉하시다니 다행이에요. 눈금이 네 칸 중 몇 칸쯤인지 알려 주시면 계산을 고칠게요.", false);
    if (it.t !== "gauge") return miss1("탱크 눈금이 네 칸 중 몇 칸쯤 남았나요? '한 칸', '반', '바닥'처럼 말씀해 주세요.");
    const g = it.liters;
      const est = Math.max(0, v.proj.levelToday);
      const ti = v.todayIdx;
      // 눈금으로 잔량을 고치고, 계수도 조금(30%) 고친다
      const startIdx = v.days.findIndex((d) => d.date === v.startDate);
      const newK = learnK(v.params, v.days, startIdx, ti, v.startLevel - g, 0.3);
      update((st) => ({
        ...st,
        gauges: { ...st.gauges, [h.id]: { date: today, level: g } },
        kOverride: { ...st.kOverride, [h.id]: newK },
      }));
      const np = project({ ...v.params, k: newK }, v.days, ti, g, ti);
      const diff = g - est;
      addLog(h.id, "잔량 보정", `눈금 '${it.label}' → ${fmtL(g)} (예상 ${fmtL(est)}), 계수 ${v.params.k.toFixed(2)}→${newK.toFixed(2)}`);
      if (np.alertDate && np.alertDate > today) {
        ai(`알려 주셔서 고마워요. 예상보다 넉넉하네요. 다시 계산하면 ${fmtDate(np.emptyDate)}쯤까지 쓰실 수 있어요. 다음 연락은 ${fmtDate(np.alertDate)}쯤 드릴게요.`);
        sys(`잔량 보정 → 다음 전화 ${fmtDate(np.alertDate)}`);
        setStage("done");
        return;
      }
      const lead = Math.abs(diff) <= 40 ? "네, 예상과 비슷해요." : diff < 0 ? "생각보다 적게 남았네요." : "알려 주셔서 고마워요.";
      ai(lead);
      return offer(suggestLiters(h.tank, g), g);
  }

  // AI가 말할 수 있는 숫자 목록 (LLM 답변 검증에도 씀)
  function facts() {
    const p = v.proj;
    const o = v.orderId ? s.orders.find((x) => x.id === v.orderId) : undefined;
    return {
      가구: `${h.label} (${h.emd})`,
      오늘: fmtDate(today),
      "오늘 남은 기름(추정)": fmtL(Math.max(0, level)),
      "예상 소진일": fmtDate(p.emptyDate),
      "다음 연락 예정일": fmtDate(p.alertDate),
      "탱크 크기": `${h.tank}리터`,
      "단골 판매소": dealer,
      "단골 판매소 가격": `리터에 ${v.price.toLocaleString()}원`,
      "제안 주문량": `${liters}리터`,
      "제안 주문 금액": fmtWon(liters * v.price),
      "배달": "주문 뒤 판매소가 확인 전화를 하고 보통 1~3일 안에 배달",
      "결제": "배달 올 때 카드나 국민행복카드로 직접 결제. AI는 돈·카드 번호를 묻지 않음",
      ...(cheap ? { [`${h.emd} 최저 주유소 등유`]: `리터에 ${cheap.kerosene.toLocaleString()}원 (${cheapLive ? "오늘" : asOf} 기준)` } : {}),
      "바우처 잔액": fmtWon(h.voucherLeft),
      ...(o ? { "주문 상태": o.status } : {}),
    };
  }

  async function reply(text: string) {
    if (!text.trim() || stage === "idle" || stage === "done" || busy) return;
    setMsgs((m) => [...m, { who: "me", text }]);
    setInput("");
    setBusy(true);
    const u = await understand(text, { stage, tank: h.tank, facts: facts(), history: msgs.slice(-8) });
    setBusy(false);
    setLastSrc({ source: u.source, note: u.note, intent: u.intent.t });
    const it = u.intent;
    if (it.t === "question") {
      ai(`${u.answer ?? "그건 제가 정확히 알지 못해요."} ${REASK[stage] ?? ""}`.trim());
      return;
    }
    leadRef.current = u.say ?? null;

    if (stage === "gauge") return gaugeStep(it);

    // 양을 바꾸는 말은 제안 단계든 확인 단계든 바뀐 양으로 다시 확인받는다
    const confirmAmount = (L: number) => {
      setLiters(L);
      ai(`${L}리터면 ${fmtWon(L * v.price)}이에요. ${dealer}에 ${L}리터 주문 넣을까요? 맞으시면 '네'라고 해 주세요.`);
      setStage("confirm");
    };

    if (stage === "offer") {
      if (it.t === "money") return moneyFlow();
      if (it.t === "amount") return confirmAmount(it.liters);
      if (it.t === "yes") {
        ai(`${liters}리터, ${fmtWon(liters * v.price)}, ${dealer}로 주문 넣을게요. 맞으시면 '네'라고 해 주세요.`);
        setStage("confirm");
        return;
      }
      if (it.t === "no") {
        ai("알겠습니다. 주문하지 않을게요. 필요하시면 언제든 이 번호로 말씀해 주세요. 내일 다시 여쭤볼게요.");
        addLog(h.id, "안내만", "가격 안내 후 주문 안 함");
        setStage("done");
        return;
      }
      return miss1("주문해 드릴까요? '응', '아니'로 말씀해 주세요.");
    }

    if (stage === "confirm") {
      if (it.t === "yes") return placeOrder();
      if (it.t === "amount") return confirmAmount(it.liters);
      if (it.t === "no") {
        ai("알겠습니다. 주문하지 않을게요.");
        addLog(h.id, "안내만", "확인 단계에서 취소");
        setStage("done");
        return;
      }
      return miss1("주문을 넣을까요? '네' 또는 '아니요'로 말씀해 주세요.");
    }

    if (stage === "checkin") {
      if (it.t === "money") return moneyFlow();
      if (it.t === "elsewhere") {
        update((st) => ({ ...st, gauges: { ...st.gauges, [h.id]: { date: today, level: h.tank * 0.75 } } }));
        addLog(h.id, "잔량 보정", "다른 곳에서 구매. 잔량을 네 칸 중 세 칸으로 가정");
        ai("다른 곳에서 넣으셨군요. 다음에 넣으실 때 양을 알려 주시면 계산이 더 정확해져요. 따뜻하게 지내세요.");
        setStage("done");
        return;
      }
      if (it.t === "away") {
        // 비운 기간을 계산에서 빼는 기능은 없다. 약속하지 않고, 눈금을 여쭤 잔량을 실제로 고친다
        addLog(h.id, "안내만", "집을 비웠던 기간 있음");
        ai("집을 비우셨었군요. 그럼 기름이 제 계산보다 남아 있겠네요. 탱크 눈금은 지금 어디쯤인가요?");
        setStage("gauge");
        return;
      }
      if (it.t === "fine" || it.t === "yes" || it.t === "plenty") {
        ai("다행이에요. 그럼 탱크 눈금은 지금 어디쯤인가요?");
        setStage("gauge");
        return;
      }
      if (it.t === "gauge") return gaugeStep(it);
      return miss1("요즘 보일러는 잘 돌리고 계세요?");
    }

    if (stage === "money") {
      if (it.t === "yes") {
        addLog(h.id, "참는 집 후보", "기름값 부담 · 생활지원사 연결 동의");
        update((st) => ({ ...st, checks: { ...st.checks, [h.id]: "요청" } }));
        ai("선생님께 전해 드릴게요. 오늘이나 내일 연락드릴 거예요. 추운데 보일러 너무 아끼지 마시고 몸 따뜻하게 하세요.");
        sys("참는 집 후보 → 군 현황판 '살펴봐 주세요'");
      } else if (it.t === "no") {
        // 연결을 원하지 않는 분은 '참는 집 후보'로 적지 않는다
        addLog(h.id, "안내만", "기름값 부담을 말함 · 연결은 원하지 않음");
        ai("알겠어요. 연결하지 않을게요. 바우처 사용처는 주민센터에서도 알려 드려요. 따뜻하게 지내세요.");
      } else {
        return miss1("생활지원사 선생님께 연결해 드릴까요? '응', '아니'로 말씀해 주세요.");
      }
      setStage("done");
    }
  }

  function listen() {
    type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; start: () => void };
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return alert("이 브라우저는 음성 인식을 지원하지 않습니다. 크롬에서 열거나 아래 버튼을 쓰세요.");
    const r = new Ctor();
    r.lang = "ko-KR";
    r.interimResults = false;
    r.onresult = (e) => reply(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  }

  const quick = QUICK[stage] ?? [];
  const famMsgs = s.family.filter((f) => f.hid === h.id);
  const logs = s.logs.filter((l) => l.hid === h.id).slice(0, 6);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* 통화 화면 */}
      <section className="card flex min-h-[520px] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 text-[17px] font-semibold">
              {h.label} <StatusBadge s={live.status} />
            </div>
            <div className="text-xs text-muted">
              {h.channel} · 주문 승인: {h.approval}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${engine?.engine === "gemini" ? "bg-accent-soft text-accent" : "bg-line text-muted"}`}
              title={lastSrc?.note}
            >
              {!engine ? "엔진 확인 중" : engine.engine === "gemini" ? `듣기: ${engine.model}` : "듣기: 규칙 (Gemini 키 없음)"}
              {lastSrc && ` · 방금 ${lastSrc.source === "gemini" ? "LLM" : "규칙"} → ${lastSrc.intent}`}
            </span>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={tts} onChange={(e) => setTts(e.target.checked)} /> 음성으로 읽기
            </label>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {stage === "idle" && (
            <div className="grid h-full place-items-center py-10 text-center">
              <div>
                <p className="mx-auto max-w-lg text-[20px] font-light leading-relaxed">{h.scenario}</p>
                <div className="mt-7 flex flex-wrap justify-center gap-2">
                  <button className="btn btn-primary" onClick={start}>
                    {h.channel === "AI 스피커" ? "AI 스피커 안내 시작" : "전화 걸기"}
                  </button>
                  <button className="btn" onClick={noAnswer}>
                    전화를 안 받으면?
                  </button>
                </div>
              </div>
            </div>
          )}
          {msgs.map((m, i) =>
            m.who === "sys" ? (
              <div key={i} className="text-center text-xs text-muted">
                — {m.text} —
              </div>
            ) : (
              <div key={i} className={`flex ${m.who === "me" ? "justify-end" : ""}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    m.who === "ai" ? "rounded-tl-sm bg-accent-soft" : "rounded-tr-sm bg-ink text-bg"
                  }`}
                >
                  <div className="mb-0.5 text-[11px] font-semibold opacity-70">{m.who === "ai" ? "AI" : "어르신"}</div>
                  {m.text}
                </div>
              </div>
            ),
          )}
          {busy && <div className="text-xs text-muted">AI가 알아듣는 중…</div>}
          <div ref={endRef} />
        </div>
        {stage !== "idle" && (
          <div className="border-t border-line px-5 py-3">
            {stage === "done" ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">통화 종료</span>
                <button className="btn" onClick={() => setStage("idle")}>
                  처음으로
                </button>
                <Link href="/dealer" className="btn">
                  판매소 화면
                </Link>
                <Link href="/households" className="btn">
                  가구 잔량
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {quick.map((q) => (
                    <button key={q} className="btn !px-3 !py-1.5 !text-[13px]" disabled={busy} onClick={() => reply(q)}>
                      {q}
                    </button>
                  ))}
                  <button className="btn !px-3 !py-1.5 !text-[13px] text-muted" disabled={busy} onClick={() => reply(CONFUSED_SAMPLE)}>
                    (엉뚱한 대답)
                  </button>
                </div>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    reply(input);
                  }}
                >
                  <input
                    className="inp flex-1"
                    placeholder="어르신 대답을 직접 입력해 보세요"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button type="button" className="btn" onClick={listen} disabled={listening}>
                    {listening ? "듣는 중…" : "말하기"}
                  </button>
                  <button className="btn btn-primary" disabled={busy}>
                    보내기
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </section>

      {/* 오른쪽: 모델 숫자, 가족 카톡, 기록 */}
      <aside className="space-y-4">
        <section className="card p-4 text-sm">
          <h3 className="sub-title">AI가 읽는 숫자 (모델 계산)</h3>
          <p className="mb-2 text-xs text-muted">AI는 이 값만 말하고 숫자를 지어내지 않습니다.</p>
          <dl className="num space-y-1">
            <Pair k="오늘 잔량(추정)" v={fmtL(Math.max(0, v.proj.levelToday))} />
            <Pair k="눈금 반영 잔량" v={stage !== "idle" && level !== Math.max(0, v.proj.levelToday) ? fmtL(level) : "—"} />
            <Pair k="예상 소진일" v={fmtDate(v.proj.emptyDate)} />
            <Pair k="알림일" v={fmtDate(v.proj.alertDate)} />
            <Pair k="단골 판매소 가격" v={`${v.price.toLocaleString()}원/L`} />
            <Pair
              k={`${h.emd} 주유소 최저 (${cheapLive ? "오피넷 실시간" : `오피넷 ${asOf}`})`}
              v={cheap ? `${cheap.kerosene.toLocaleString()}원/L` : "없음"}
            />
            <Pair k="제안 주문량" v={fmtL(liters)} />
            <Pair k="바우처 잔액(가상)" v={fmtWon(h.voucherLeft)} />
          </dl>
        </section>

        <section className="card overflow-hidden text-sm">
          <div className="bg-[#fee500] px-4 py-2 font-bold text-[#191919]">카카오톡 · {h.family ?? "가족 미등록"}</div>
          <div className="max-h-64 space-y-2 overflow-y-auto bg-[#bacee0] p-3 text-[#191919]">
            {famMsgs.length === 0 && <p className="text-center text-xs opacity-60">아직 받은 알림이 없습니다</p>}
            {famMsgs.map((f) => {
              const o = f.orderId ? s.orders.find((x) => x.id === f.orderId) : undefined;
              return (
                <div key={f.id} className="rounded-xl bg-white p-2.5 text-[13px] leading-snug">
                  {f.text}
                  {o?.status === "가족 승인 대기" && (
                    <div className="mt-2 flex gap-1">
                      <button
                        className="flex-1 rounded-lg bg-[#fee500] py-1 font-bold"
                        onClick={() => {
                          update((st) => ({ ...st, orders: st.orders.map((x) => (x.id === o.id ? { ...x, status: "접수" } : x)) }));
                          addLog(h.id, "주문", `가족 승인 완료 · ${o.liters}L`);
                        }}
                      >
                        승인
                      </button>
                      <button
                        className="flex-1 rounded-lg bg-gray-100 py-1"
                        onClick={() => update((st) => ({ ...st, orders: st.orders.map((x) => (x.id === o.id ? { ...x, status: "취소" } : x)) }))}
                      >
                        거절
                      </button>
                    </div>
                  )}
                  {o && o.status !== "가족 승인 대기" && <div className="mt-1 text-[11px] opacity-60">주문 상태: {o.status}</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-4 text-sm">
          <h3 className="sub-title">기록</h3>
          {logs.length === 0 ? (
            <p className="mt-1 text-xs text-muted">아직 없음</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {logs.map((l) => (
                <li key={l.id} className="text-xs">
                  <b>{l.kind}</b> <span className="text-muted">{l.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
