import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "등유 안심 · 울주군 시범 프로토타입",
  description: "기름이 떨어지기 전에 먼저 전화하는 AI. 울산 울주군 시범 시연용 웹 데모",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs leading-relaxed text-muted">
          <p>
            시연용 프로토타입입니다. 가구와 판매소(○○상회 등)는 모두 가상입니다. 기온은 Open-Meteo 예보 API, 주유소 등유
            가격은 오피넷 전국개별주유소가격(2026-09-19 내려받음), 노인 인구는 공공데이터포털 울주군 노인인구 현황
            (2025-08-20)입니다. 시연 조작은 이 브라우저에만 저장됩니다.
          </p>
          <p className="mt-1">팀 유일무이 · 한국석유공사 AI·데이터 서포터즈 · 기름알리미 분야 B</p>
        </footer>
      </body>
    </html>
  );
}
