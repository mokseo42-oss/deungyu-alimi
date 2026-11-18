"use client";
import Link from "next/link";
import { Loading, StatusBadge } from "@/components/ui";
import { fmtDate } from "@/lib/model";
import { DELIVERED, Note, OPT_OUT, SEND_RULES } from "@/lib/notify";
import { useHouseholds, View } from "@/lib/useModel";
import { removePriceRule, useStore } from "@/lib/store";
import { cheapestIn, useStations } from "@/lib/stations";

// 알림 탭: 어르신 문자, 가족 알림톡이 언제 어떤 문구로 가는지 미리 보고, 보낸 알림과 안 보낸 이유를 본다.
// 기름알리미 '알림' 탭과 같은 발송 규칙(lib/notify)을 쓴다. 실제 발송은 하지 않는다.
const RULES = [
  `밤 ${SEND_RULES.quietFrom - 12}시부터 아침 ${SEND_RULES.quietTo}시까지는 보내지 않고 아침 ${SEND_RULES.quietTo}시로 미룹니다.`,
  "같은 알림은 한 번만 보냅니다.",
  `먼저 알려 드리는 '안내' 알림은 한 사람에게 하루 ${SEND_RULES.perDay}건까지만 보냅니다.`,
  "받는 분이 메시지 안에서 바로 수신을 거부할 수 있습니다.",
  "AI가 만든 문장은 숫자를 계산값과 대조하고, 맞지 않으면 보내지 않습니다.",
];

const CATS = [
  { t: "안내", d: "기름이 곧 떨어짐처럼 먼저 알려 드리는 알림. 위 규칙을 모두 따릅니다." },
  { t: "확인", d: "주문 접수, 가족 승인, 배달 완료처럼 하신 일에 대한 답. 밤에는 미루지만 하루 건수에는 세지 않습니다." },
  { t: "긴급", d: "몸이 안 좋다고 하실 때, 보일러가 꺼졌을 때, 전화를 두 번 안 받으셨을 때. 시간과 건수에 막히지 않고 바로 보냅니다." },
];

const short = (stamp?: string) =>
  stamp ? `${Number(stamp.slice(5, 7))}/${Number(stamp.slice(8, 10))} ${stamp.slice(11, 16)}` : "";

export default function AlertsPage() {
  const { weather, error, views } = useHouseholds();
  const s = useStore();
  const st = useStations();
  if (!views || !weather) return <Loading error={error} />;

  const labelOf = (hid: string) => views.find((v) => v.h.id === hid)?.h.label ?? hid;
  const elderChannel = (hid: string) => (views.find((v) => v.h.id === hid)?.h.channel === "AI 스피커" ? "AI 스피커" : "문자");
  const rows = [
    ...(s.elder ?? []).map((n) => ({ n, to: "어르신", ch: elderChannel(n.hid) })),
    ...s.family.map((n) => ({ n, to: "가족", ch: "알림톡" })),
  ].sort((a, b) => (b.n.at ?? "").localeCompare(a.n.at ?? ""));

  return (
    <div className="page space-y-10">
      <header>
        <h1 className="page-title">알림</h1>
        <p className="page-lead">
          어르신께 가는 문자와 가족에게 가는 카카오톡 알림톡을 한곳에서 봅니다. 기름알리미와 같은 발송 규칙을 쓰고, 시연이라
          실제로 보내지는 않습니다.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="sec-title">다음에 보낼 알림</h2>
        <ul className="mt-4 divide-y divide-line">
          {views.map((v) => (
            <Upcoming key={v.h.id} v={v} today={weather.today} />
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="sec-title">가격 조건</h2>
        <p className="mt-1 text-[14px] text-muted">
          물어보기에서 &ldquo;1,500원 밑으로 내려가면 알려 줘&rdquo;처럼 말하면 조건이 생깁니다. 최대 5개. 지금 점검은 오피넷{" "}
          {st.live ? `${st.asOf} 실시간` : `${st.asOf} 저장 자료`} 최저가로 확인합니다.
        </p>
        {(s.priceRules ?? []).length === 0 ? (
          <p className="mt-3 text-[15px]">
            아직 없습니다.{" "}
            <Link href="/home" className="underline underline-offset-4">
              물어보기에서 말로 걸기
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {(s.priceRules ?? []).map((r) => {
              const low = cheapestIn(st.stations, r.emd);
              const hit = low && low.kerosene < r.price;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[15px]">
                  <span className="font-medium">
                    {r.emd} 등유가 리터에 {r.price.toLocaleString("ko-KR")}원 밑이면
                  </span>
                  <span className={hit ? "font-semibold text-ok" : "text-muted"}>
                    {low
                      ? `지금 최저 ${low.name} ${low.kerosene.toLocaleString("ko-KR")}원 → ${hit ? "조건에 닿음, 아침 8시~밤 9시 사이에 알림" : "아직 아님"}`
                      : "이 읍면에는 등유 가격이 있는 주유소가 없음"}
                  </span>
                  <button className="ml-auto text-[13px] text-muted underline underline-offset-4" onClick={() => removePriceRule(r.id)}>
                    지우기
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card p-6">
          <h2 className="sec-title">보낸 알림</h2>
          {rows.length === 0 ? (
            <p className="mt-3 text-[15px] text-muted">
              아직 없습니다.{" "}
              <Link href="/call" className="underline underline-offset-4">
                AI 전화
              </Link>
              에서 주문을 넣거나 &lsquo;전화를 안 받으면?&rsquo;을 눌러 보세요.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>받는 분</th>
                    <th>종류</th>
                    <th>내용</th>
                    <th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ n, to, ch }) => (
                    <tr key={n.id} className={n.status && !DELIVERED.includes(n.status) ? "text-muted" : ""}>
                      <td className="num whitespace-nowrap text-[13px]">{short(n.at)}</td>
                      <td className="whitespace-nowrap text-[13px]">
                        {labelOf(n.hid)}
                        <br />
                        {to} · {ch}
                      </td>
                      <td className="whitespace-nowrap text-[13px]">{n.cat ?? "안내"}</td>
                      <td className="min-w-[16em] text-[13px] leading-relaxed">{n.text}</td>
                      <td className="whitespace-nowrap text-[13px] font-medium">
                        <Result n={n} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="sec-title">발송 규칙</h2>
          <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed">
            {RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-fuel" />
                {r}
              </li>
            ))}
          </ul>
          <h3 className="sub-title mt-6">알림 종류</h3>
          <dl className="mt-3 space-y-3 text-[14px] leading-relaxed">
            {CATS.map((c) => (
              <div key={c.t}>
                <dt className="font-semibold">{c.t}</dt>
                <dd className="text-muted">{c.d}</dd>
              </div>
            ))}
          </dl>
          <h3 className="sub-title mt-6">수신 거부</h3>
          <ul className="mt-3 space-y-1 text-[14px] text-muted">
            {Object.entries(OPT_OUT).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Result({ n }: { n: Note }) {
  if (!n.status || n.status === "보냄") return <span className="text-ok">보냄</span>;
  if (n.status === "아침에 보냄") return <span>아침 {short(n.sendAt)}에 보냄</span>;
  return <span>{n.status}</span>;
}

// 집마다 다음에 갈 알림을 계산값으로 미리 보여 준다
function Upcoming({ v, today }: { v: View; today: string }) {
  const { h, proj, status } = v;
  const sms = h.channel === "AI 스피커" ? "AI 스피커 알림 말" : "어르신 문자";
  let when = "";
  let what = "";
  let preview = "";
  let optOut = true; // 생활지원사에게 가는 업무 알림에는 수신 거부 안내를 붙이지 않는다
  if (status === "ordered") {
    when = "배달을 마치면";
    what = `${sms}${h.family ? " · 가족 알림톡" : ""} (확인)`;
    preview = "[등유 알리미] 등유를 넣어 드렸어요. 따뜻하게 지내세요.";
  } else if (status === "check") {
    when = "지금";
    what = "생활지원사 '살펴봐 주세요'";
    preview = `기름이 ${fmtDate(proj.emptyDate)}쯤 떨어졌을 것 같은데 주문이 없습니다. 한번 찾아가 봐 주세요.`;
    optOut = false;
  } else if (proj.alertDate) {
    // 알림일이 이미 지났으면(아직 전화를 안 한 시연 상태) 오늘 건다
    when = `${proj.alertDate <= today ? "오늘" : fmtDate(proj.alertDate)} 오전 10시`;
    what = `AI ${h.channel === "AI 스피커" ? "스피커 안내" : "전화"} → 못 받으시면 오후 1시 ${sms}${h.family ? " · 가족 알림톡" : ""} (안내)`;
    preview = `[등유 알리미] 어르신, 보일러 기름이 ${fmtDate(proj.emptyDate)}쯤 떨어질 것 같아요. 기름을 넣으시려면 ${h.channel === "AI 스피커" ? "AI 스피커에 말씀해 주세요" : "이 번호로 전화 주세요"}.`;
  } else {
    when = "당분간 없음";
    what = "이번 겨울 안에 떨어질 일이 없어 보입니다";
  }
  return (
    <li className="grid gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div>
        <div className="flex flex-wrap items-center gap-2 font-medium">
          {h.label} <StatusBadge s={status} />
        </div>
        <p className="num mt-1 text-[14px] text-muted">{when}</p>
      </div>
      <div>
        <p className="text-[14px] font-medium">{what}</p>
        {preview && (
          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-[14px] leading-relaxed">
            {preview}
            {optOut && (
              <span className="mt-1 block text-[12px] text-muted">{h.channel === "AI 스피커" ? OPT_OUT["AI 스피커"] : OPT_OUT.문자}</span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}
