"use client";
import { useEffect, useRef } from "react";
import { heroFrame, LOOP, STILL } from "@/lib/heroLoop";

// 첫 화면 오른쪽 9초 반복 그림. 서버에서는 첫 장면을 그려 두고, 브라우저에서 1초에 30번 다시 그립니다.
// 화면 밖으로 스크롤하면 멈추고, 움직임 줄이기 설정이면 두 말풍선이 다 뜬 한 장면만 보여 줍니다.
// 사진으로 되돌리려면 page.tsx에서 <HeroLoop />를 <HeroPhoto />로 바꾸면 됩니다.
export default function HeroLoop() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let visible = true;
    let last = -1;
    const start = performance.now();

    const tick = (now: number) => {
      const t = ((now - start) / 1000) % LOOP;
      const frame = Math.floor(t * 30);
      if (frame !== last) {
        last = frame;
        svg.innerHTML = heroFrame(t);
      }
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (reduce.matches) {
        svg.innerHTML = heroFrame(STILL);
        return;
      }
      if (visible) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    });
    io.observe(svg);
    reduce.addEventListener("change", run);
    run();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      reduce.removeEventListener("change", run);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className="hero-loop"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="마당 탱크의 등유가 줄어들자 등유 안심 AI가 어르신께 먼저 전화해 주문을 여쭙고, 유조차가 와서 다시 채우는 그림"
      dangerouslySetInnerHTML={{ __html: heroFrame(0) }}
    />
  );
}
