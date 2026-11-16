import AppNav from "@/components/AppNav";

// 기능 화면 틀. 기름알리미와 같은 모양: 흰 바탕, 왼쪽 아이콘 메뉴(휴대폰은 아래 둥근 메뉴), 회색 둥근 카드, 바닥글 한 줄
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AppNav />
      <div className="app-body">
        <main id="main">{children}</main>
        <footer className="app-foot">
          유가 정보: 한국석유공사 오피넷 제공 · 기온: Open-Meteo · 공공데이터 활용 · 팀 유일무이 · 시연용(가구·판매소는 가상, 공식
          서비스 아님)
        </footer>
      </div>
    </div>
  );
}
