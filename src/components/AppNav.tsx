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

// 기능 화면 메뉴. 로고를 누르면 소개 페이지로, 옆의 '홈' 딱지를 누르면 기능 화면 홈으로 간다
export default function AppNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 h-[var(--nav-h)] border-b border-line bg-white/90 backdrop-blur">
      <div className="wrap flex h-full flex-wrap items-center gap-x-10 md:flex-nowrap">
        <div className="flex h-14 items-center gap-2.5 md:h-full">
          <Link href="/" className="text-[19px] font-bold tracking-tight" aria-label="등유 안심 소개 페이지로">
            등유 안심
          </Link>
          <Link
            href={APP_HOME}
            className="tag hover:bg-[#333333]"
            aria-label={`${APP_NAME} 홈`}
            aria-current={path === APP_HOME ? "page" : undefined}
          >
            홈
          </Link>
        </div>
        <nav
          aria-label={`${APP_NAME} 화면`}
          className="no-scrollbar order-last -mx-1 flex h-12 w-full items-center gap-x-5 overflow-x-auto whitespace-nowrap px-1 md:order-none md:mx-0 md:h-full md:w-auto md:flex-1 md:gap-x-9 md:px-0"
        >
          {LINKS.map((l) => {
            const on = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={`border-b py-1 text-[16px] ${
                  on ? "border-ink font-semibold" : "border-transparent font-medium hover:border-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-x-5 text-[13px] text-muted">
          <Link href="/" className="underline-offset-4 hover:text-ink hover:underline">
            서비스 소개
          </Link>
          <button
            className="underline-offset-4 hover:text-ink hover:underline"
            onClick={() => {
              if (confirm("주문·통화 기록·보정값을 모두 지우고 처음 상태로 돌릴까요?")) resetDemo();
            }}
          >
            시연 초기화
          </button>
        </div>
      </div>
    </header>
  );
}
