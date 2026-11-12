import Image from "next/image";

// 첫 화면 오른쪽 사진: 눈 내린 저녁의 한옥마을 지붕과 골목 불빛.
// 촬영지는 울주가 아니라 전주 한옥마을이므로 캡션에 그대로 밝힌다.
// Unsplash 라이선스(상업적 사용 무료, 출처 표기 의무 없음). 출처는 예의로 표기
export const HERO_PHOTO = {
  src: "https://images.unsplash.com/photo-1673179559805-8dfbf64e10d4",
  page: "https://unsplash.com/photos/uyjIW7N1GR0",
  author: "Clark Gu",
  place: "전주 한옥마을",
};

export default function HeroPhoto() {
  return (
    <>
      <Image
        src={`${HERO_PHOTO.src}?auto=format&fit=crop&q=80&w=2000`}
        alt="눈 덮인 한옥 지붕들이 이어진 저녁 마을. 골목과 처마 밑에 따뜻한 불빛이 켜져 있다"
        fill
        priority
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="hero-photo"
      />
      <figcaption className="hero-caption">
        눈 내린 저녁, {HERO_PHOTO.place} ·{" "}
        <a href={HERO_PHOTO.page} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          사진 {HERO_PHOTO.author} / Unsplash
        </a>
      </figcaption>
    </>
  );
}
