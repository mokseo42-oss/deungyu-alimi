// 시연용 가상 가구. 실제 사람이 아닙니다.

export type Household = {
  id: string;
  label: string; // 화면 표시용
  person: string;
  emd: string;
  lat: number;
  lon: number;
  tank: number; // L
  k: number; // 집 계수 L/난방도일
  base: number; // 기본 사용량 L/일
  lastDeliveryLiters: number; // 배달 직후 탱크 양
  // 시연 상태: 마지막 배달일을 실제 기온으로 거꾸로 맞춰, 언제 열어도 같은 장면이 나오게 함
  demo: { type: "levelToday"; liters: number } | { type: "emptyDaysAgo"; days: number };
  channel: "AI 스피커" | "AI 전화";
  approval: "기본" | "가족 승인";
  family?: string;
  dealer: string; // 단골 판매소(가상)
  dealerPrice: number; // 가상 판매소 오늘 가격
  voucherLeft: number; // 바우처 잔액(가상)
  scenario: string;
  notes: string[];
};

export const HOUSEHOLDS: Household[] = [
  {
    id: "A",
    label: "상북면 A 할머니",
    person: "A 할머니 (82세, 혼자 사심)",
    emd: "상북면",
    lat: 35.59,
    lon: 129.05,
    tank: 200,
    k: 0.5,
    base: 1.0,
    lastDeliveryLiters: 200,
    // 70L: "예상 소진일이 14일 안일 때만 전화" 조건에서도 오늘 '먼저 전화' 장면이 나오게(80L면 15일쯤 남아 여유로 보인다)
    demo: { type: "levelToday", liters: 70 },
    channel: "AI 스피커",
    approval: "기본",
    family: "딸 (부산)",
    dealer: "상북 ○○상회 (가상)",
    dealerPrice: 1560,
    voucherLeft: 442200,
    scenario: "잔량이 알림 기준에 닿아 AI 스피커가 먼저 안내합니다. 동의하시면 주문합니다.",
    notes: ["AI 스피커 스마트돌봄 설치 가구", "지난겨울 드럼 6번 구매"],
  },
  {
    id: "B",
    label: "두서면 B 할아버지 부부",
    person: "B 할아버지·할머니 부부 (84세, 81세)",
    emd: "두서면",
    lat: 35.66,
    lon: 129.1,
    tank: 200,
    k: 0.65,
    base: 1.2,
    lastDeliveryLiters: 180,
    demo: { type: "levelToday", liters: 95 },
    channel: "AI 전화",
    approval: "가족 승인",
    family: "아들 (서울)",
    dealer: "두서 △△유류 (가상)",
    dealerPrice: 1580,
    voucherLeft: 442200,
    scenario: "AI 전화에 \"아직 많아\"라고 답하면 눈금으로 잔량을 고치고 다음 전화 날짜를 다시 계산합니다.",
    notes: ["청력 저하로 가족 승인 단계", "아들에게 카카오톡 알림"],
  },
  {
    id: "C",
    label: "두동면 C 할머니",
    person: "C 할머니 (79세, 혼자 사심)",
    emd: "두동면",
    lat: 35.64,
    lon: 129.19,
    tank: 200,
    k: 0.24,
    base: 0.8,
    lastDeliveryLiters: 60,
    demo: { type: "emptyDaysAgo", days: 10 },
    channel: "AI 전화",
    approval: "기본",
    dealer: "두동 □□상회 (가상)",
    dealerPrice: 1540,
    voucherLeft: 147000,
    scenario: "예상 소진일이 지났는데 주문이 없습니다. 계수도 지역 중앙값의 절반 미만이라 '참는 집' 후보로 생활지원사에게 알립니다.",
    notes: ["집 계수가 지역 중앙값의 절반 미만", "노인맞춤돌봄 대상"],
  },
];

export const REGION_MEDIAN_K = 0.5; // 01 문서 중간값 가구
