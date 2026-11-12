import AppNav from "@/components/AppNav";

// 기능 화면 틀
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <main id="main">{children}</main>
      <footer className="border-t border-line">
        <p className="wrap py-8 text-[13px] leading-relaxed text-muted">
          울주군이나 한국석유공사가 운영하는 공식 서비스가 아니라, 한국석유공사 AI·데이터 서포터즈 팀 유일무이가 만든 시연용
          프로토타입입니다. 가구와 판매소(○○상회 등)는 모두 가상입니다. 기온은 Open-Meteo 예보 API, 주유소 등유 가격은
          오피넷 실시간 최저가 20곳과 전국개별주유소가격 저장 자료(2026-09-19), 노인 인구는 공공데이터포털 울주군 노인인구
          현황(2025-08-20)입니다. 시연 조작은 이 브라우저에만 저장됩니다.
        </p>
      </footer>
    </>
  );
}
