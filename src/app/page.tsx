import Link from "next/link";

const SCREENS = [
  {
    href: "/households",
    title: "가구 잔량",
    who: "생활지원사 · 가족",
    body: "실제 울주 기온과 예보로 가상 가구 3곳의 남은 기름, 알림일, 소진일, 겨울 부족액을 매일 다시 계산합니다.",
  },
  {
    href: "/call",
    title: "AI 전화",
    who: "어르신",
    body: "AI가 먼저 전화해 눈금을 묻고, 가격을 읽어 드리고, 동의하시면 주문을 넣습니다. 숫자는 모델이, 말은 AI가 맡습니다.",
  },
  {
    href: "/dealer",
    title: "판매소",
    who: "등유 판매소",
    body: "들어온 주문을 확인 전화하고, 배달량을 입력하면 그 집 계수가 고쳐집니다. 이번 주 소진 예상 마을을 묶어 봅니다.",
  },
  {
    href: "/dashboard",
    title: "군 현황판",
    who: "울주군 복지·에너지 담당",
    body: "읍면별 노인 인구, 등유 주유소, 살펴봐 주세요 가구, 한파 위험, 겨울 부족액, 배관 우선 마을 근거를 한 화면에.",
  },
];

const FACTS = [
  { v: "약 9,100세대", l: "울주군 도시가스 미공급 (2025)", s: "울산 5개 구·군 중 보급률 최저" },
  { v: "44,943명", l: "울주군 65세 이상 (2025.8)", s: "두서면은 주민의 54.8%가 노인" },
  { v: "39곳 / 93곳", l: "등유를 파는 울주 주유소", s: "41.9%, 전국 50.2%보다 낮음" },
  { v: "약 1.45배", l: "제주 대비 울주 겨울 난방도일", s: "제주 검증 계수를 그대로 쓰면 안 됨" },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="grid gap-6 pt-4 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="text-sm font-semibold text-accent">고유가 위기 대응 AI 기름알리미 · 분야 B</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight md:text-4xl">
            기름이 떨어지기 전에
            <br />
            먼저 전화하는 AI
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            도시가스는 쓰고 나서 냅니다. 등유는 남은 양을 직접 보고, 판매소에 직접 전화하고, 드럼 하나에 30만 원 넘게 먼저 내야
            합니다. 등유 안심은 기온과 배달 기록으로 집마다 기름이 떨어지는 날을 예측해, 그 전에 어르신께 먼저 연락합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/call" className="btn btn-primary">
              AI 전화 시연 보기
            </Link>
            <Link href="/dashboard" className="btn">
              울주군 현황판
            </Link>
          </div>
        </div>
        <div className="card p-5 text-sm leading-relaxed">
          <div className="font-semibold">모델 한 줄</div>
          <code className="mt-2 block rounded-lg bg-accent-soft p-3 text-[13px] text-ink">
            남은 기름 = 배달 뒤 탱크 양 − Σ(기본 사용량 + 집 계수 × 난방도일)
          </code>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
            <li>
              알림: 잔량이 <b className="text-ink">7일 쓸 양 + 50L</b> 아래로 (한파 예보면 70L)
            </li>
            <li>소진일 7일 뒤에도 주문이 없으면 &quot;살펴봐 주세요&quot;</li>
            <li>배달할 때마다 집 계수를 다시 배움</li>
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {FACTS.map((f) => (
          <div key={f.l} className="card p-4">
            <div className="num text-xl font-bold">{f.v}</div>
            <div className="mt-1 text-sm font-medium">{f.l}</div>
            <div className="mt-0.5 text-xs text-muted">{f.s}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-bold">시연 화면 네 가지</h2>
        <p className="mt-1 text-sm text-muted">
          화면끼리 이어집니다. AI 전화에서 주문하면 판매소 화면에 뜨고, 판매소가 배달을 마치면 가구 잔량과 현황판이 바뀝니다.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SCREENS.map((s, i) => (
            <Link key={s.href} href={s.href} className="card group p-5 transition hover:border-accent">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft text-accent">{i + 1}</span>
                {s.who}
              </div>
              <div className="mt-2 text-lg font-bold group-hover:text-accent">{s.title} →</div>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card p-5 text-sm leading-relaxed text-muted">
        <h2 className="text-base font-bold text-ink">이 데모에서 실제인 것과 가상인 것</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <div className="font-semibold text-ok">실제 자료</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>울주군 12개 읍면 기온과 16일 예보 (Open-Meteo)</li>
              <li>울주군 주유소 등유 가격 39곳 (오피넷, 2026-09-19)</li>
              <li>읍면별 65·75·80세 이상 인구 (공공데이터포털, 2025-08-20)</li>
              <li>울주 평년 월별 난방도일 (2023~26 ERA5 계산)</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-call">가상</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>A·B·C 가구와 현황판의 등록 가구</li>
              <li>○○상회 같은 판매소 이름과 배달 가격, 바우처 잔액</li>
              <li>AI 대화는 규칙 기반 시나리오 (실제 전화망 연결 없음)</li>
              <li>가구 단위 예측은 아직 실측 검증 전 (01 모델검증 문서)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
