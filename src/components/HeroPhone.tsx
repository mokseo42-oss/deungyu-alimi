"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PHONE_SLIDES, SHOT_H, SHOT_W, SLIDE_MOVE_MS, SLIDE_MS, STILL_SLIDE } from "@/lib/heroPhone";

// 첫 화면 오른쪽: 휴대폰 틀 안에서 실제 시연 화면 4장이 옆으로 넘어간다(오일나우 서비스 소개 페이지 참고).
// 가구 잔량 → AI 전화 → 주문 → 판매소 → 다시 가구 잔량.
// 화면마다 따로 움직인다: 지금 화면은 왼쪽으로 나가고, 다음 화면은 오른쪽에서 들어온다. 나머지는 오른쪽 밖에서 기다린다.
// 그래서 멈춰 있는 화면은 늘 같은 자리(0)에 있어 처음으로 돌아갈 때도 글씨가 흔들리지 않는다.
// 화면 밖으로 스크롤하거나 탭이 가려지면 멈추고, 움직임 줄이기 설정이면 AI가 먼저 전화하는 화면에 멈춘다.
// 반복 그림으로 되돌리려면 page.tsx에서 <HeroPhone />을 <HeroLoop />로 바꾸면 된다.
const N = PHONE_SLIDES.length;

export default function HeroPhone() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(false); // 첫 그림과 움직임 줄이기에서는 옮기는 효과 없이

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let timer = 0;
    const run = () => {
      window.clearInterval(timer);
      if (reduce.matches) {
        setAnimate(false);
        setIndex(STILL_SLIDE);
        return;
      }
      if (visible && !document.hidden) {
        timer = window.setInterval(() => {
          setAnimate(true);
          setIndex((i) => (i + 1) % N);
        }, SLIDE_MS);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    });
    io.observe(el);
    reduce.addEventListener("change", run);
    document.addEventListener("visibilitychange", run);
    run();
    return () => {
      window.clearInterval(timer);
      io.disconnect();
      reduce.removeEventListener("change", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);

  const move = `transform ${SLIDE_MOVE_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`;

  return (
    <div
      ref={ref}
      className="hero-phone"
      role="img"
      aria-label={`휴대폰 안에서 등유 안심 시연 화면이 차례로 넘어갑니다: ${PHONE_SLIDES.map((s) => s.label).join(", ")}`}
    >
      <div className="hero-phone-device">
        <div className="hero-phone-screen">
          <div className="hero-phone-status">
            <span>10:00</span>
            <i className="hero-phone-island" />
            <svg viewBox="0 0 64 24" aria-hidden="true">
              <path d="M2 18h3v4H2zM8 14h3v8H8zM14 10h3v12h-3zM20 6h3v16h-3z" fill="currentColor" />
              <rect x="32" y="5" width="26" height="15" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
              <rect x="35" y="8" width="18" height="9" rx="2" fill="currentColor" />
              <path d="M60 10v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <div className="hero-phone-track">
            {PHONE_SLIDES.map((s, k) => {
              const now = k === index;
              const leaving = k === (index - 1 + N) % N;
              return (
                <Image
                  key={s.src}
                  src={s.src}
                  alt=""
                  width={SHOT_W}
                  height={SHOT_H}
                  sizes="(min-width: 1024px) 340px, 240px"
                  priority={k === 0}
                  loading={k === 0 ? undefined : "eager"}
                  className="hero-phone-shot"
                  style={{
                    transform: `translateX(${now ? 0 : leaving ? -100 : 100}%)`,
                    transition: animate && (now || leaving) ? move : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <p className="hero-phone-caption" aria-hidden="true">
        실제 시연 화면 · {PHONE_SLIDES[index].label}
      </p>
    </div>
  );
}
