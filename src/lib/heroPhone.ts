// 첫 화면 휴대폰 틀(HeroPhone)에서 차례로 넘어가는 실제 시연 화면.
// 사진은 scripts/hero-phone-shots.mjs로 찍는다: 390×844 휴대폰 화면을 2배 해상도로 찍어 780×1688.
// 앱 화면이 바뀌면 그 스크립트를 다시 돌리면 된다.
export const SHOT_W = 780;
export const SHOT_H = 1688;

export const SLIDE_MS = 2800; // 한 화면을 보여 주는 시간
export const SLIDE_MOVE_MS = 550; // 옆 화면으로 넘어가는 시간

export const PHONE_SLIDES = [
  { src: "/hero-phone/1-households.jpg", label: "가구 잔량" },
  { src: "/hero-phone/2-call.jpg", label: "AI 전화" },
  { src: "/hero-phone/3-order.jpg", label: "주문" },
  { src: "/hero-phone/4-dealer.jpg", label: "판매소" },
] as const;

// 움직임 줄이기 설정이면 이 화면에 멈춘다: AI가 먼저 전화해 소진일을 알리는 장면
export const STILL_SLIDE = 1;
