import SiteNav from "@/components/SiteNav";

// 소개 페이지 틀
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main id="main">{children}</main>
      <footer className="on-night bg-night text-white">
        <div className="wrap flex flex-col gap-10 py-16 md:flex-row md:justify-between">
          <div>
            <div className="text-[22px] font-bold tracking-tight">등유 안심</div>
            <ul className="mt-4 space-y-1 text-sm">
              <li>팀 유일무이</li>
              <li>한국석유공사 AI·데이터 서포터즈</li>
              <li>기름알리미 분야 B</li>
            </ul>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-night-muted md:text-right">
            울주군이나 한국석유공사가 운영하는 공식 서비스가 아니라, 서포터즈 팀이 만든 시연용 프로토타입입니다. 가구와
            판매소(○○상회 등)는 모두 가상입니다. 기온은 Open-Meteo 예보 API, 주유소 등유
            가격은 오피넷 실시간 최저가 20곳과 전국개별주유소가격 저장 자료(2026-09-19), 노인 인구는 공공데이터포털 울주군
            노인인구 현황(2025-08-20)입니다. 시연 조작은 이 브라우저에만 저장됩니다.
          </p>
        </div>
      </footer>
    </>
  );
}
