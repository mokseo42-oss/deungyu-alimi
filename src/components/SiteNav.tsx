"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_HOME, APP_NAME } from "@/lib/routes";

const SECTIONS = [
  { href: "#about", label: "소개" },
  { href: "#facts", label: "울주군 현황" },
  { href: "#model", label: "예측 모델" },
  { href: "#screens", label: "화면 구성" },
  { href: "#data", label: "자료 출처" },
];

// 소개 페이지 메뉴: 페이지 안 구역으로 이동하고, 오른쪽 버튼이 실제 기능으로 들어간다
export default function SiteNav() {
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 h-[var(--nav-h)] border-b transition-colors duration-200 ${
        atTop ? "border-transparent bg-transparent" : "border-line bg-white/90 backdrop-blur"
      }`}
    >
      <div className="wrap flex h-full flex-wrap items-center gap-x-10 md:flex-nowrap">
        <Link href="/" className="flex h-14 items-center md:h-full" aria-label="등유 안심 처음으로">
          <span className="text-[19px] font-bold tracking-tight">등유 안심</span>
        </Link>
        <nav
          aria-label="소개 페이지 구역"
          className="no-scrollbar order-last -mx-1 flex h-12 w-full items-center gap-x-5 overflow-x-auto whitespace-nowrap px-1 md:order-none md:mx-0 md:h-full md:w-auto md:flex-1 md:gap-x-9 md:px-0"
        >
          {SECTIONS.map((s) => (
            <a key={s.href} href={s.href} className="border-b border-transparent py-1 text-[16px] font-medium hover:border-ink">
              {s.label}
            </a>
          ))}
        </nav>
        <Link href={APP_HOME} className="btn btn-primary ml-auto !px-4 !py-2 md:!px-5 md:!py-2.5">
          {APP_NAME} 시작하기
        </Link>
      </div>
    </header>
  );
}
