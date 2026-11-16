"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resetDemo } from "@/lib/store";
import { APP_HOME, APP_NAME } from "@/lib/routes";

const LINKS = [
  { href: "/households", label: "가구 잔량" },
  { href: "/call", label: "AI 전화" },
  { href: "/dealer", label: "판매소" },
  { href: "/dashboard", label: "군 현황판" },
];

// 기능 화면 메뉴(검은 윗줄). 로고를 누르면 기능 화면 홈으로, 오른쪽 '서비스 소개'를 누르면 소개 페이지로 간다
export default function AppNav() {
  const path = usePathname();
  return (
    <header className="app-bar on-night sticky top-0 z-20 h-[var(--nav-h)]">
      <div className="wrap flex h-full flex-wrap items-center gap-x-8 md:flex-nowrap">
        <div className="flex h-14 items-center gap-2.5 md:h-full">
          <Link
            href={APP_HOME}
            className="text-[18px] font-bold tracking-tight"
            aria-label={`${APP_NAME} 홈`}
            aria-current={path === APP_HOME ? "page" : undefined}
          >
            {APP_NAME}
          </Link>
          <span className="app-badge">시연</span>
        </div>
        <nav
          aria-label={`${APP_NAME} 화면`}
          className="no-scrollbar order-last -mx-1 flex h-12 w-full items-stretch gap-x-1 overflow-x-auto whitespace-nowrap px-1 md:order-none md:mx-0 md:h-full md:w-auto md:flex-1 md:px-0"
        >
          {LINKS.map((l) => {
            const on = path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined} className="app-tab">
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-x-5 text-[13px] text-night-muted">
          <Link href="/" className="underline-offset-4 hover:text-white hover:underline">
            서비스 소개
          </Link>
          <button
            className="underline-offset-4 hover:text-white hover:underline"
            onClick={() => {
              if (confirm("주문, 통화 기록, 고친 계산값을 모두 지우고 처음 상태로 돌릴까요?")) resetDemo();
            }}
          >
            처음부터 다시
          </button>
        </div>
      </div>
    </header>
  );
}
