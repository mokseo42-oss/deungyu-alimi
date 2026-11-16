import Link from "next/link";
import Evidence from "@/components/Evidence";
import HeroStory from "@/components/HeroStory";
import ScreenTour from "@/components/ScreenTour";
import { APP_HOME, APP_NAME } from "@/lib/routes";

// 전국 숫자. 출처: 2020 주택총조사(농촌경제연구원 현안분석 97호 재인용), 오피넷 2026-10-01 평균가, 바우처는 보도
const FACTS = [
  { v: "184만 가구", l: "기름보일러로 겨울을 나는 집", s: "전국 8.8%. 면 지역은 48.1%, 두 집 중 한 집 (2020)" },
  { v: "31만 원", l: "한 번 넣을 때 먼저 내는 돈", s: "등유 한 드럼(200L), 10월 1일 전국 평균 1,573원 기준" },
  { v: "한 달", l: "바우처로 버티는 기간", s: "44만 2,200원이면 약 281L. 한겨울 한 달 300L 쓰는 집도 있습니다" },
  { v: "약 50만 명", l: "이미 돌봄 전화를 받는 어르신", s: "노인맞춤돌봄 (2023). 새 전화망 없이 얹을 수 있습니다" },
];

// 울주군을 첫 시범 지역으로 고른 이유
const ULJU = [
  { v: "약 9,100세대", l: "도시가스가 들어가지 않는 집 (2025)", s: "울산 5개 구·군 중 가장 많습니다" },
  { v: "54.8%", l: "두서면 주민 중 65세 이상 (2026.8)", s: "울주 65세 이상은 4만 4,943명" },
  { v: "39곳", l: "등유를 파는 주유소 (93곳 중, 2026.9)", s: "41.9%로 전국 50.2%보다 적습니다" },
];

// 누구를 위한 서비스인가
const WHO = [
  {
    t: "어르신",
    d: "이 서비스가 지키려는 분입니다. 앱 없이 전화만 받으시면 되고, 통화 내용은 큰 글씨 문자로 한 번 더 보내 드립니다. 전화를 놓치셔도 문자로 아실 수 있습니다. 기름을 넣을지는 늘 어르신이 정합니다.",
  },
  {
    t: "자녀",
    d: "멀리 사는 자녀는 카카오톡으로 소식을 받습니다. 주문이 들어갔는지, 전화를 안 받으셨는지 바로 압니다.",
  },
  { t: "생활지원사", d: "기름이 떨어졌는데 주문이 없는 집, 기름값이 부담된다고 하신 집을 먼저 찾아갈 수 있게 알려 드립니다." },
  { t: "판매소와 군청", d: "판매소는 주문과 이번 주 배달할 마을을 한 화면에서 봅니다. 군청은 어느 마을이 추운지 봅니다." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <figure className="hero-figure">
            <HeroStory />
          </figure>
          <div className="hero-copy">
            <h1 className="hero-title">
              기름이 떨어지기 전에
              <br />
              먼저 전화하는 AI
            </h1>
            <p className="mt-6 max-w-[30em] text-[17px] font-light leading-[1.75] md:text-[18px]">
              혼자 사시는 어르신은 보일러 기름이 얼마나 남았는지 직접 보고, 직접 전화해서 시켜야 합니다. 등유 안심이 날씨를
              보고 먼저 알아채 전화드리고, 어르신께는 문자로, 자녀에게는 카카오톡으로 함께 알려 드립니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link href={APP_HOME} className="hero-cta">
                {APP_NAME} 시작하기
              </Link>
              <a href="#about" className="border-b border-ink pb-0.5 text-[17px] font-light">
                어떤 서비스인지 먼저 보기
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="wrap grid gap-8 py-20 md:grid-cols-2 md:gap-16 md:py-32">
        <h2 className="text-[22px] font-normal leading-[1.6] md:text-[24px]">
          도시가스 집은 겪지 않는
          <br />
          겨울 걱정
        </h2>
        <div className="space-y-4 text-[18px] font-light leading-[1.75] md:text-[20px]">
          <p>
            도시가스는 쓰고 나서 돈을 냅니다. 등유는 다릅니다. 탱크 눈금을 직접 보고, 판매소에 직접 전화하고, 한 드럼에 30만
            원 넘게 먼저 내야 합니다.
          </p>
          <p>
            추운 날 탱크가 있는 마당까지 나가기 어려운 어르신, 돈이 무서워 보일러를 아껴 트는 어르신에게는 기름이 바닥나야
            알게 되는 일이 생깁니다.
          </p>
          <p>등유 안심은 날씨와 지난 배달 기록으로 집마다 기름이 떨어질 날을 미리 계산해, 그 전에 먼저 전화드립니다.</p>
        </div>
        {/* 소개 영상: 누르기 전에는 내려받지 않는다(preload="none"). 만든 과정은 '11월 미션/등유 안심/소개영상' 폴더 */}
        <figure className="md:col-span-2">
          <video className="aspect-video w-full bg-night" controls preload="none" playsInline poster="/intro-poster.jpg">
            <source src="/intro.mp4" type="video/mp4" />
          </video>
          <figcaption className="mt-3 text-[15px] text-muted">서비스 소개 영상 · 31초 · 소리를 켜고 보세요</figcaption>
        </figure>
      </section>

      <section id="facts" className="wrap pb-20 md:pb-28">
        <h2 className="text-[22px] md:text-[24px]">전국의 등유 가구</h2>
        <dl className="mt-10 grid grid-cols-1 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.l} className="border-l border-[#a9a9a9] py-1 pl-6 pr-4 md:pl-8">
              <dt className="text-[18px] font-normal leading-snug md:text-[20px]">{f.l}</dt>
              <dd className="num mt-7 whitespace-nowrap text-[38px] font-light leading-[1.2] lg:text-[clamp(28px,2.75vw,42px)]">{f.v}</dd>
              <dd className="mt-7 text-[15px] text-muted md:text-[16px]">{f.s}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="wrap grid gap-10 pb-20 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16 md:pb-32">
        <div>
          <h2 className="text-[22px] md:text-[24px]">울주군에서 먼저 시작하는 이유</h2>
          <p className="mt-5 text-[17px] font-light leading-[1.75]">
            도시가스가 닿지 않는 산골 마을이 많고 어르신 비율이 높습니다. 여기서 맞는지 확인한 뒤, 면 지역이 많은 다른 시군으로
            넓힙니다. 기온만 그 지역 것으로 바꾸면 같은 계산을 쓸 수 있습니다.
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-y-10 sm:grid-cols-3">
          {ULJU.map((f) => (
            <div key={f.l} className="border-l border-line py-1 pl-6 pr-4">
              <dt className="text-[16px] leading-snug">{f.l}</dt>
              <dd className="num mt-4 text-[30px] font-light leading-[1.2]">{f.v}</dd>
              <dd className="mt-4 text-[14px] text-muted">{f.s}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="who" className="border-t border-line">
        <div className="wrap py-20 md:py-28">
          <h2 className="text-[22px] md:text-[24px]">누구를 위한 서비스인가요</h2>
          <p className="mt-5 max-w-[40em] text-[17px] font-light leading-[1.75]">
            지키려는 분은 혼자 사시는 어르신입니다. 어르신은 전화만 받으시고, 화면은 어르신을 돌보는 사람들이 봅니다.
          </p>
          <ul className="mt-10 grid gap-y-8 md:grid-cols-4">
            {WHO.map((w, i) => (
              <li key={w.t} className={`border-l py-1 pl-6 pr-4 ${i === 0 ? "border-fuel" : "border-line"}`}>
                <h3 className="text-[19px] font-medium">{w.t}</h3>
                <p className="mt-3 text-[16px] font-light leading-relaxed">{w.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="model" className="bg-mist">
        <div className="wrap py-20 md:py-28">
          <h2 className="text-[22px] md:text-[24px]">기름이 떨어질 날을 어떻게 아나요</h2>
          <p className="mt-8 max-w-4xl text-[clamp(22px,2.6vw,32px)] font-extralight leading-[1.5]">
            추운 날일수록 기름을 많이 씁니다. 마지막으로 넣은 양에서 날마다 쓴 만큼을 빼면 남은 양이 나옵니다.
          </p>
          <ul className="mt-12 grid gap-y-6 text-[17px] leading-relaxed md:grid-cols-3">
            <li className="border-l border-[#a9a9a9] pl-6 pr-4">
              기름이 <b className="font-semibold">3주 안</b>에 떨어질 것 같고, 남은 양이 일주일 쓸 만큼에 50L를 더한 것보다 적으면
              전화드립니다. 한파가 오면 70L로 넉넉히 잡습니다.
            </li>
            <li className="border-l border-[#a9a9a9] pl-6 pr-4">
              떨어질 날이 일주일 지나도 주문이 없으면 생활지원사에게 &quot;살펴봐 주세요&quot;라고 알립니다.
            </li>
            <li className="border-l border-[#a9a9a9] pl-6 pr-4">기름을 넣을 때마다 그 집이 실제로 쓴 양을 보고 계산을 고칩니다.</li>
          </ul>
          <p className="mt-10 text-[14px] text-muted">
            계산식: 남은 기름 = 배달 뒤 탱크 양 − Σ(기본 사용량 + 집 계수 × 난방도일)
          </p>
        </div>
      </section>

      <Evidence />

      <ScreenTour />

      <section id="data" className="wrap py-20 md:py-32">
        <h2 className="text-[22px] md:text-[24px]">이 데모에서 실제인 것과 가상인 것</h2>
        <p className="mt-6 max-w-4xl text-[17px] leading-relaxed md:text-[18px]">
          울주군이나 한국석유공사가 운영하는 공식 서비스가 아닙니다. 한국석유공사 AI·데이터 서포터즈 팀 유일무이가 제안한 아이디어를
          보여 주려고 만든 시연용입니다.
        </p>
        <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-16">
          <div className="border-t border-ink pt-5">
            <h3 className="text-[20px] font-medium">실제 자료</h3>
            <ul className="mt-4 text-[16px] md:text-[17px]">
              <li className="border-b border-line py-3">울주군 12개 읍면 기온과 16일 예보 (Open-Meteo)</li>
              <li className="border-b border-line py-3">울주군 주유소 등유 가격 (오피넷 실시간 최저가 20곳 + 2026-09-19 저장 자료 39곳)</li>
              <li className="border-b border-line py-3">읍면별 65·75·80세 이상 인구 (공공데이터포털, 2025-08-20)</li>
              <li className="border-b border-line py-3">울주 월별 난방도일 평균 (2023~26 세 겨울, ERA5 계산)</li>
            </ul>
          </div>
          <div className="border-t border-ink pt-5">
            <h3 className="text-[20px] font-medium">가상</h3>
            <ul className="mt-4 text-[16px] md:text-[17px]">
              <li className="border-b border-line py-3">A·B·C 가구와 현황판의 등록 가구</li>
              <li className="border-b border-line py-3">○○상회 같은 판매소 이름과 배달 가격, 바우처 잔액</li>
              <li className="border-b border-line py-3">AI 전화는 화면 안 시연 (실제 전화망 연결 없음)</li>
              <li className="border-b border-line py-3">
                가구 단위 예측은 아직 실측 검증 전 (
                <a href="#evidence" className="underline underline-offset-4">
                  검증 결과
                </a>
                )
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-mist">
        <div className="wrap flex flex-col items-start gap-8 py-20 md:flex-row md:items-center md:justify-between md:py-24">
          <h2 className="text-[26px] font-light leading-snug md:text-[32px]">
            울주군 시연 가구로
            <br />
            직접 써 보세요
          </h2>
          <Link href={APP_HOME} className="btn btn-primary !px-11 !py-[18px] !text-[18px]">
            {APP_NAME} 시작하기
          </Link>
        </div>
      </section>
    </>
  );
}
