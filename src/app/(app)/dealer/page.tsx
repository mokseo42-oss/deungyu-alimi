"use client";
import { useMemo, useState } from "react";
import { Loading, StatusBadge } from "@/components/ui";
import { useRegistry, View } from "@/lib/useModel";
import { addDays, fmtDate, fmtL, fmtWon, indexOfDate, learnK } from "@/lib/model";
import { Order, addFamily, addLog, update, useStore } from "@/lib/store";
import { HOUSEHOLDS } from "@/data/households";

export default function DealerPage() {
  const { weather, error, views, synth } = useRegistry();
  const s = useStore();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const dealers = Array.from(new Set(HOUSEHOLDS.map((h) => h.dealer)));
  const orders = s.orders.filter((o) => o.status !== "취소");

  // 이번 주 소진 예상 마을 (서부 4개 면 등록 가구, 7일 안에 알림일이 오는 집)
  const week = useMemo(() => {
    if (!weather || !synth || !views) return [];
    const end = addDays(weather.today, 7);
    const all = [...views, ...synth].filter((v) => ["두서면", "두동면", "상북면", "삼동면"].includes(v.h.emd));
    const groups: Record<string, View[]> = {};
    for (const v of all) {
      if (v.status === "check" || v.status === "ordered") continue;
      if (v.proj.alertDate && v.proj.alertDate <= end) (groups[v.h.emd] ??= []).push(v);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [weather, synth, views]);

  if (!views || !weather)
    return (
      <div className="page">
        <Loading error={error} />
      </div>
    );

  return (
    <div className="page space-y-12">
      <header>
        <h1 className="page-title">판매소 화면</h1>
        <p className="page-lead">
          AI는 주문만 전달합니다. 판매소가 어르신께 확인 전화를 하고, 배달 때 사람 앞에서 결제합니다. 배달량을 입력하면 그 집 계수가 다시
          계산됩니다. 문자 회신으로도 받을 수 있게 설계합니다.
        </p>
      </header>

      <section className="card p-5">
        <h2 className="sec-title">오늘 들어온 주문</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-muted">아직 주문이 없습니다. AI 전화 화면에서 A 할머니와 통화해 주문을 넣어 보세요.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>가구</th>
                  <th>판매소</th>
                  <th>양</th>
                  <th>금액</th>
                  <th>경로</th>
                  <th>상태</th>
                  <th>처리</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <OrderRow key={o.id} o={o} v={views.find((v) => v.h.id === o.hid)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="sec-title">이번 주 소진 예상 마을</h2>
          <p className="mt-1 text-xs text-muted">
            7일 안에 알림일이 오는 등록 가구를 면별로 묶었습니다. 같은 마을을 한 번에 돌면 배달 횟수가 줄어듭니다(일본 실증: 급유 횟수 20%,
            배송 일수 36% 감소). 시연 가구 + 가상 등록 가구.
          </p>
          <ul className="mt-3 space-y-2">
            {week.length === 0 && <li className="text-sm text-muted">이번 주 예상 가구가 없습니다.</li>}
            {week.map(([emd, list]) => (
              <li key={emd} className="border-b border-line py-4">
                <div className="flex items-center justify-between">
                  <b>{emd}</b>
                  <span className="num text-sm">
                    {list.length}가구 · 약 {fmtL(list.reduce((a, v) => a + (v.h.tank - Math.max(0, v.proj.levelToday)), 0))}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {list
                    .sort((a, b) => (a.proj.alertDate ?? "").localeCompare(b.proj.alertDate ?? ""))
                    .slice(0, 12)
                    .map((v) => (
                      <span key={v.h.id} className="bg-accent-soft px-2 py-1 text-xs">
                        {v.h.label.replace(`${emd} `, "")} ·{" "}
                        {v.proj.alertDate && v.proj.alertDate <= weather.today ? "오늘" : fmtDate(v.proj.alertDate).replace(/ \(.\)/, "")}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="sec-title">오늘 가격 입력</h2>
          <p className="mt-1 text-xs text-muted">판매소 배달가는 공개 자료에 없어 판매소가 직접 입력합니다. AI 전화가 이 값을 읽습니다.</p>
          <div className="mt-3 space-y-2">
            {dealers.map((d) => {
              const cur = s.dealerPrices[d] ?? HOUSEHOLDS.find((h) => h.dealer === d)!.dealerPrice;
              return (
                <form
                  key={d}
                  className="flex items-center gap-2 text-sm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(prices[d]);
                    if (n > 500 && n < 3000) update((st) => ({ ...st, dealerPrices: { ...st.dealerPrices, [d]: n } }));
                  }}
                >
                  <span className="flex-1">{d}</span>
                  <span className="num text-muted">{cur.toLocaleString()}원</span>
                  <input
                    className="inp num w-24"
                    placeholder="새 가격"
                    value={prices[d] ?? ""}
                    onChange={(e) => setPrices({ ...prices, [d]: e.target.value })}
                  />
                  <button className="btn !py-1">저장</button>
                </form>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function OrderRow({ o, v }: { o: Order; v?: View }) {
  const [amount, setAmount] = useState(String(o.liters));
  const [bad, setBad] = useState(false);
  const set =(status: Order["status"], extra: Partial<Order> = {}) =>
    update((st) => ({ ...st, orders: st.orders.map((x) => (x.id === o.id ? { ...x, status, ...extra } : x)) }));

  function deliver() {
    if (!v) return;
    // 빈칸, 글자, 0은 배달로 적지 않는다(전에는 "0L 배달 완료"가 가족 알림까지 나갔다)
    const n = Number(amount);
    if (!(n > 0)) return setBad(true);
    const L = Math.min(v.h.tank, n);
    const today = v.days[v.todayIdx].date;
    const before = Math.max(0, v.proj.levelToday);
    const after = Math.min(v.h.tank, before + L);
    // 실제 쓴 양 = 지난 시작 잔량 − 배달 직전 잔량. 배달 직전 잔량은 "배달 뒤 − 배달량"으로 본다(가득 채웠다고 가정)
    const startIdx = Math.max(0, indexOfDate(v.days, v.startDate));
    const consumed = v.startLevel - (after - L);
    const newK = learnK(v.params, v.days, startIdx, v.todayIdx, consumed, 0.5);
    update((st) => ({
      ...st,
      orders: st.orders.map((x) => (x.id === o.id ? { ...x, status: "배달 완료", delivered: L } : x)),
      deliveries: { ...st.deliveries, [o.hid]: { date: today, litersAfter: after } },
      gauges: Object.fromEntries(Object.entries(st.gauges).filter(([k]) => k !== o.hid)),
      kOverride: { ...st.kOverride, [o.hid]: newK },
    }));
    addLog(o.hid, "배달", `${L}L 배달 · 탱크 ${fmtL(after)} · 계수 ${v.params.k.toFixed(2)}→${newK.toFixed(2)}`);
    if (v.h.family) addFamily(o.hid, `[등유 안심] 부모님 댁에 등유 ${L}L 배달을 마쳤어요. (${o.dealer.replace(" (가상)", "")})`);
  }

  return (
    <tr>
      <td>
        <div className="font-medium">{v?.h.label ?? o.hid}</div>
        {v && <StatusBadge s={v.status} />}
      </td>
      <td>{o.dealer}</td>
      <td className="num">{fmtL(o.liters)}</td>
      <td className="num">{fmtWon(o.liters * o.price)}</td>
      <td className="text-xs">{o.via}</td>
      <td className="text-xs font-semibold">{o.status}</td>
      <td>
        {o.status === "가족 승인 대기" && <span className="text-xs text-muted">가족 승인 기다리는 중</span>}
        {o.status === "접수" && (
          <div className="flex gap-1">
            <button className="btn !py-1 text-xs" onClick={() => set("판매소 확인")}>
              확인 전화 완료
            </button>
            <button className="btn !py-1 text-xs" onClick={() => set("취소")}>
              취소
            </button>
          </div>
        )}
        {o.status === "판매소 확인" && (
          <div className="flex items-center gap-1">
            <input
              className="inp num w-16 !py-1 text-xs"
              aria-label="배달량(리터)"
              aria-invalid={bad}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setBad(false);
              }}
            />
            <span className="text-xs">L</span>
            <button className="btn btn-primary !py-1 text-xs" onClick={deliver}>
              배달 완료
            </button>
            {bad && (
              <span role="alert" className="text-xs text-empty">
                배달량을 숫자로 넣어 주세요
              </span>
            )}
          </div>
        )}
        {o.status === "배달 완료" && <span className="text-xs text-ok">배달 {fmtL(o.delivered ?? o.liters)}</span>}
      </td>
    </tr>
  );
}
