import Link from "next/link";
import Evidence from "@/components/Evidence";
import HeroPhone from "@/components/HeroPhone";
import ScreenTour from "@/components/ScreenTour";
import { APP_HOME, APP_NAME } from "@/lib/routes";

const FACTS = [
  { v: "약 9,100세대", l: "울주군 도시가스 미공급 (2025)", s: "울산 5개 구·군 중 보급률 최저" },
  { v: "44,943명", l: "울주군 65세 이상 (2025.8)", s: "두서면은 주민의 54.8%가 노인" },
  { v: "39곳 / 93곳", l: "등유를 파는 울주 주유소 (2026.9)", s: "41.9%, 전국 50.2%보다 낮음" },
  { v: "약 1.45배", l: "제주 대비 울주 겨울 난방도일", s: "제주 검증 계수를 그대로 쓰면 안 됨" },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <figure className="hero-figure">
            <HeroPhone />
          </figure>
          <div className="hero-copy">
            <h1 className="hero-title">
              기름이 떨어지기 전에
              <br />
              먼저 전화하는 AI
            </h1>
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
        <p className="text-[22px] font-normal leading-[1.6] md:text-[24px]">고유가 위기 대응 AI 기름알리미</p>
        <div className="space-y-4 text-[18px] font-light leading-[1.75] md:text-[20px]">
          <p>
            도시가스는 쓰고 나서 냅니다. 등유는 남은 양을 직접 보고, 판매소에 직접 전화하고, 드럼 하나에 30만 원 넘게 먼저
            내야 합니다.
          </p>
          <p>등유 안심은 기온과 배달 기록으로 집마다 기름이 떨어지는 날을 예측해, 그 전에 어르신께 먼저 연락합니다.</p>
        </div>
        {/* 소개 영상: 누르기 전에는 내려받지 않는다(preload="none"). 만든 과정은 '11월 미션/등유 안심/소개영상' 폴더 */}
        <figure className="md:col-span-2">
          <video className="aspect-video w-full bg-night" controls preload="none" playsInline poster="/intro-poster.jpg">
            <source src="/intro.mp4" type="video/mp4" />
          </video>
          <figcaption className="mt-3 text-[15px] text-muted">서비스 소개 영상 · 31초 · 소리를 켜고 보세요</figcaption>
        </figure>
      </section>

      <section id="facts" className="wrap pb-20 md:pb-36">
        <dl className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.l} className="border-l border-[#a9a9a9] py-1 pl-6 pr-4 md:pl-8">
              <dt className="text-[18px] font-normal leading-snug md:text-[20px]">{f.l}</dt>
              <dd className="num mt-7 whitespace-nowrap text-[38px] font-light leading-[1.2] lg:text-[clamp(28px,2.75vw,42px)]">{f.v}</dd>
              <dd className="mt-7 text-[15px] text-muted md:text-[16px]">{f.s}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="model" className="bg-mist">
        <div className="wrap py-20 md:py-28">
          <h2 className="text-[22px] md:text-[24px]">모델 한 줄</h2>
          <p className="mt-8 max-w-5xl text-[clamp(23px,3.1vw,40px)] font-extralight leading-[1.45]">
            남은 기름 = 배달 뒤 탱크 양 − Σ(기본 사용량 + 집 계수 × 난방도일)
          </p>
          <ul className="mt-12 grid gap-y-6 text-[17px] leading-relaxed md:grid-cols-3">
            <li className="border-l border-[#a9a9a9] pl-6 pr-4">
              알림: 예상 소진일이 <b className="font-semibold">3주 안</b>이고 잔량이{" "}
              <b className="font-semibold">7일 쓸 양 + 50L</b> 아래일 때 (한파 예보면 70L)
            </li>
            <li className="border-l border-[#a9a9a9] pl-6 pr-4">소진일 7일 뒤에도 주문이 없으면 &quot;살펴봐 주세요&quot;</li>
            <li className="border-l border-[#a9a9a9] pl-6 pr-4">배달할 때마다 집 계수를 다시 배움</li>
          </ul>
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
