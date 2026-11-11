import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "등유 안심 · 울주군 시범 프로토타입",
  description: "기름이 떨어지기 전에 먼저 전화하는 AI. 울산 울주군 시범 시연용 웹 데모",
};

// 소개 페이지는 (site), 기능 화면은 (app) 그룹이 각자 메뉴와 바닥글을 가집니다
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
        <a href="#main" className="skip">
          본문으로 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
