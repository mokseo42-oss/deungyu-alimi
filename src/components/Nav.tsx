"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resetDemo } from "@/lib/store";

const LINKS = [
  { href: "/", label: "소개" },
  { href: "/households", label: "가구 잔량" },
  { href: "/call", label: "AI 전화" },
  { href: "/dealer", label: "판매소" },
  { href: "/dashboard", label: "군 현황판" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm text-white">油</span>
          <span>등유 안심</span>
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">울주군 시범</span>
        </Link>
        <nav className="order-last flex w-full gap-1 overflow-x-auto text-sm whitespace-nowrap md:order-none md:w-auto md:flex-1">
          {LINKS.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 font-medium ${on ? "bg-ink text-bg" : "text-muted hover:bg-accent-soft hover:text-ink"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          className="ml-auto text-xs text-muted underline-offset-2 hover:underline"
          onClick={() => {
            if (confirm("주문·통화 기록·보정값을 모두 지우고 처음 상태로 돌릴까요?")) resetDemo();
          }}
        >
          시연 초기화
        </button>
      </div>
    </header>
  );
}
