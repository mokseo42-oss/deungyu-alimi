"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resetDemo } from "@/lib/store";
import { APP_HOME, APP_NAME } from "@/lib/routes";

// 기능 화면 메뉴. 기름알리미와 같은 모양: 넓은 화면은 왼쪽 아이콘 세로 메뉴, 휴대폰은 아래에 떠 있는 둥근 메뉴.
// 아이콘은 24칸 선 그림(굵기 1.8)
const ICON: Record<string, React.ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z" />,
  tank: (
    <>
      <rect x="6" y="3.5" width="12" height="17" rx="3" />
      <path d="M6 13h12M10 16.5h4" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
  truck: (
    <>
      <path d="M3 6.5h11v9H3zM14 9.5h3.5l3 3v3H14" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  board: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M8 15.5v-3M12 15.5V9M16 15.5v-5" />
    </>
  ),
  bell: <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" />,
};

const LINKS = [
  { href: APP_HOME, label: "홈", icon: "home" },
  { href: "/households", label: "가구 잔량", icon: "tank" },
  { href: "/call", label: "AI 전화", icon: "phone" },
  { href: "/dealer", label: "판매소", icon: "truck" },
  { href: "/dashboard", label: "현황판", icon: "board" },
  { href: "/alerts", label: "알림", icon: "bell" },
];

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON[name]}
    </svg>
  );
}

function reset() {
  if (confirm("주문, 통화 기록, 알림, 고친 계산값을 모두 지우고 처음 상태로 돌릴까요?")) resetDemo();
}

export default function AppNav() {
  const path = usePathname();
  const on = (href: string) => (href === APP_HOME ? path === APP_HOME : path.startsWith(href));
  return (
    <>
      {/* 넓은 화면: 왼쪽 세로 메뉴 */}
      <aside className="app-side">
        <Link href={APP_HOME} aria-label={`${APP_NAME} 홈`} className="app-orb" />
        <nav aria-label={`${APP_NAME} 화면`} className="mt-8 flex flex-col gap-1.5">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={on(l.href) ? "page" : undefined} className="app-side-link">
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
        </nav>
        <button className="app-side-link mt-auto" onClick={reset}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.7h3.7" />
          </svg>
          처음부터
        </button>
      </aside>

      {/* 윗줄: 이름과 소개로 가는 길 */}
      <header className="app-head">
        <div className="app-head-in">
          <Link href={APP_HOME} className="flex items-center gap-2">
            <span className="app-orb app-orb-sm lg:hidden" aria-hidden="true" />
            <span className="text-[17px] font-bold tracking-tight">{APP_NAME}</span>
          </Link>
          <span className="app-badge">시연</span>
          <div className="ml-auto flex items-center gap-4 text-[13px] text-muted">
            <Link href="/" className="underline-offset-4 hover:text-ink hover:underline">
              서비스 소개
            </Link>
            <button className="underline-offset-4 hover:text-ink hover:underline lg:hidden" onClick={reset}>
              처음부터
            </button>
          </div>
        </div>
      </header>

      {/* 휴대폰: 아래에 떠 있는 둥근 메뉴 */}
      <nav aria-label={`${APP_NAME} 화면`} className="app-bottom">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={on(l.href) ? "page" : undefined} className="app-bottom-link">
            <Icon name={l.icon} />
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
