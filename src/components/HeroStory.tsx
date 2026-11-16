import Image from "next/image";
import { HERO_PHOTO } from "@/components/HeroPhoto";

// 첫 화면 오른쪽: 우리가 푸는 문제를 한 장면으로.
// 눈 내린 마을(실제 사진) 위에 세 카드가 차례로 뜬다.
//   ① 혼자 사시는 어르신 댁 기름이 곧 바닥  ② AI가 먼저 전화해 주문  ③ 어르신(문자)과 자녀(카톡)가 함께 알림을 받음
// 카드 속 가구와 대화는 시연용 예시다(캡션에 밝힘). 움직임 줄이기 설정이면 세 카드가 처음부터 다 보인다.
export default function HeroStory() {
  return (
    <>
      <Image
        src={`${HERO_PHOTO.src}?auto=format&fit=crop&q=80&w=2000`}
        alt="눈 덮인 지붕이 이어진 저녁 마을. 골목에 따뜻한 불빛이 켜져 있다"
        fill
        priority
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="hero-photo"
      />
      <div className="story" aria-label="예시 장면: 기름이 떨어지기 전에 AI가 먼저 전화하고, 어르신과 자녀에게 함께 알린다">
        <div className="story-card story-tank">
          <p className="story-who">상북면 할머니 댁</p>
          <p className="story-big">기름이 5일 뒤면 떨어져요</p>
          <div className="story-gauge" aria-hidden="true">
            <i style={{ width: "18%" }} />
          </div>
        </div>

        <div className="story-card story-call">
          <p className="story-who">AI가 먼저 전화</p>
          <p className="story-bubble story-ai">할머니, 기름 넣어 드릴까요?</p>
          <p className="story-bubble story-me">그래, 반 드럼만.</p>
        </div>

        <div className="story-card story-family">
          <p className="story-who">할머니 문자 · 아드님 카톡</p>
          <p className="story-text">등유 100L 주문했어요. 내일 갖다 드려요.</p>
        </div>
      </div>
      <figcaption className="hero-caption">
        예시 장면 · 사진: 눈 내린 저녁, {HERO_PHOTO.place} (
        <a href={HERO_PHOTO.page} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          {HERO_PHOTO.author} / Unsplash
        </a>
        )
      </figcaption>
    </>
  );
}
