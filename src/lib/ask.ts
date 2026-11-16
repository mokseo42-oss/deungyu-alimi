// 등유 챗봇(홈 화면 '무엇이든 물어보세요')의 질문 종류, 사실 목록, 정해 둔 답.
// 원칙(기름알리미와 같음): AI는 말을 쓰고, 숫자는 계산·조회 값만 쓴다. 답 속 숫자를 사실 목록과 대조해 맞을 때만 보여 준다.
// Gemini가 없거나 실패하거나 숫자가 맞지 않으면 여기 정해 둔 답을 쓴다.
import { fmtDate } from "@/lib/model";

export type Topic =
  | "alert" // 가격 알림 조건 걸기
  | "cheapest" // 우리 동네 제일 싼 등유
  | "empty" // 우리 집 기름 언제 떨어져
  | "cold" // 한파 오면 얼마나 더 써
  | "voucher" // 바우처로 얼마나 버텨
  | "amount" // 반 드럼·한 드럼 얼마
  | "why" // 등유값 왜 이래, 최고가격
  | "pay" // 값은 어떻게 내
  | "delivery" // 언제 갖다줘
  | "other";

// 우리 집 계산값(브라우저가 모델로 계산해 보낸다)
export type HouseFacts = {
  today: string; // 계산한 날
  label: string;
  emd: string;
  tank: number;
  level: number; // 오늘 남은 기름(L)
  emptyDate: string | null;
  daysLeft: number | null;
  alertDate: string | null;
  use7: number; // 앞으로 7일 쓸 양
  usual7: number; // 지난 7일 쓴 양
  coldDates: string[]; // 앞으로 7일 안 한파 신호 날짜
  dealer: string;
  dealerPrice: number;
  voucher: number; // 바우처 잔액(가상)
  voucherDays: number | null; // 바우처로 살 수 있는 양으로 버티는 날수
  voucherUntil: string | null;
};

// 등유 가격(서버가 오피넷에서 조회)
export type PriceFacts = {
  live: boolean;
  asOf: string;
  ujuAvg: number | null;
  ujuDiff: number | null;
  natAvg: number | null;
  natDiff: number | null;
  emd: string;
  emdCheapest: { name: string; price: number } | null;
  ujuCheapest: { name: string; emd: string; price: number } | null;
};

// 석유 최고가격(정유사 공급가 상한). 등유는 리터에 1,380원으로 묶여 있음(10차 9/19, 11·12차 동결. 06 기획안 기준)
export const KEROSENE_CAP = { price: 1380, note: "12차 고시(11월 14일 적용)까지 같은 값" };
export const VOUCHER_UNTIL = "2027년 5월 31일";

export function topicOf(q: string): Topic {
  const s = q.replace(/\s+/g, " ");
  if (parsePriceRule(q)) return "alert";
  if (/알려|알림/.test(s) && /떨어|바닥|미리/.test(s)) return "alert";
  if (/바우처|에너지 ?바우처|지원금/.test(s)) return "voucher";
  if (/한파|추워|추우|추운|영하|강추위/.test(s)) return "cold";
  if (/(제일|가장|젤|더) ?싼|최저가?|싼 ?(데|곳|주유소)/.test(s)) return "cheapest";
  if (/언제.*(떨어|바닥|없어)|얼마나 ?남|며칠|남은 ?(기름|양)|(떨어|바닥).*(언제|날)/.test(s)) return "empty";
  if (/(반 ?드럼|한 ?드럼|드럼|\d+ ?(리터|L|l)|말).*(얼마|값|가격)|(얼마).*(반 ?드럼|한 ?드럼|드럼|리터)/.test(s)) return "amount";
  if (/왜|비싸|올랐|오르|내렸|최고 ?가격|고시|유류세/.test(s)) return "why";
  if (/(값|돈|결제|계산|카드)/.test(s) && /(어떻게|언제|뭐로|어디|내)/.test(s)) return "pay";
  if (/(언제|며칠).*(갖다|배달|와|걸려)|배달/.test(s)) return "delivery";
  if (/얼마/.test(s)) return "amount";
  return "other";
}

// "1,500원 밑으로 내려가면 알려 줘" → 1500
export function parsePriceRule(q: string): number | null {
  const m = q.replace(/,/g, "").match(/(\d{3,4}) ?원/);
  if (!m) return null;
  if (!/(밑|아래|이하|내려|떨어지|싸지)/.test(q) || !/(알려|알림)/.test(q)) return null;
  const p = Number(m[1]);
  return p >= 500 && p <= 3000 ? p : null;
}

// 받침에 따라 조사를 고른다: josa("상회", "은", "는") → "상회는"
export function josa(word: string, withBatchim: string, without: string) {
  const ch = word.replace(/[)\]\s]+$/, "").slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  const has = code >= 0 && code <= 11171 ? code % 28 !== 0 : /[0-9LlMmNn]$/.test(ch) && !/[2459]$/.test(ch);
  return word + (has ? withBatchim : without);
}

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const perL = (n: number) => `리터에 ${n.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}원`;
const L = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}L`;
const diffTxt = (d: number) => (d === 0 ? "어제와 같음" : `어제보다 ${Math.abs(d).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}원 ${d > 0 ? "오름" : "내림"}`);
const dates = (ds: string[]) => ds.map((d) => fmtDate(d)).join(", ");

// 답에 쓸 수 있는 사실 목록. Gemini에 그대로 보여 주고, 답 속 숫자를 이 목록과 대조한다
export function factsFor(topic: Topic, p: PriceFacts, h: HouseFacts | null): Record<string, string> {
  const f: Record<string, string> = {};
  f["가격 기준"] = p.live ? `오피넷 ${p.asOf} 조회` : `오피넷 저장 자료 ${p.asOf}`;
  if (p.ujuAvg != null) f["울주군 등유 평균"] = `${perL(p.ujuAvg)}${p.ujuDiff != null ? `, ${diffTxt(p.ujuDiff)}` : ""}`;
  if (p.natAvg != null) f["전국 등유 평균"] = `${perL(p.natAvg)}${p.natDiff != null ? `, ${diffTxt(p.natDiff)}` : ""}`;
  if (p.emdCheapest) f[`${p.emd} 등유 최저가 주유소`] = `${p.emdCheapest.name}, ${perL(p.emdCheapest.price)}`;
  if (p.ujuCheapest) f["울주군 등유 최저가 주유소"] = `${p.ujuCheapest.name}(${p.ujuCheapest.emd}), ${perL(p.ujuCheapest.price)}`;
  if (p.ujuAvg != null && p.emdCheapest) f[`${p.emd} 최저가와 울주 평균 차이`] = `${(p.ujuAvg - p.emdCheapest.price).toFixed(1)}원`;
  f["석유 최고가격(등유)"] = `정유사 공급가 상한 ${perL(KEROSENE_CAP.price)}, ${KEROSENE_CAP.note}. 주유소·판매소 판매가의 상한은 아님`;
  f["주유소 가격 주의"] = "주유소 가격이라 배달이 되는지는 따로 확인해야 함";
  f["배달"] = "주문하면 판매소가 확인 전화를 하고 보통 1~3일 안에 배달";
  f["결제"] = "배달 올 때 카드나 국민행복카드로 직접 결제. AI는 돈이나 카드 번호를 묻지 않음";
  f["바우처 사용기한"] = VOUCHER_UNTIL;
  f["국제유가와 판매가"] = "국내 판매가는 보통 국제유가와 환율 변화를 2~3주 늦게 따라감(수치는 말하지 않음)";
  if (h) {
    f["가구"] = `${h.label} (${h.emd})`;
    f["오늘 남은 기름(추정)"] = `약 ${L(h.level)} (탱크 ${L(h.tank)})`;
    f["예상 소진일"] = h.emptyDate ? `${fmtDate(h.emptyDate)}${h.daysLeft != null ? `, ${h.daysLeft > 0 ? `${h.daysLeft}일 남음` : "이미 지남"}` : ""}` : "이번 겨울 안에는 없음";
    if (h.alertDate) f["먼저 전화하는 날"] = h.alertDate <= h.today ? `${fmtDate(h.alertDate)}부터 전화할 때(이미 지남)` : fmtDate(h.alertDate);
    f["앞으로 7일 쓸 양"] = `약 ${L(h.use7)}`;
    f["지난 7일 쓴 양"] = `약 ${L(h.usual7)}`;
    f["앞으로 7일 한파 신호"] = h.coldDates.length ? dates(h.coldDates) : "없음";
    f["단골 판매소"] = `${h.dealer}, ${perL(h.dealerPrice)}`;
    f["반 드럼(100L) 값"] = won(100 * h.dealerPrice);
    f["한 드럼(200L) 값"] = won(200 * h.dealerPrice);
    f["탱크에 들어갈 자리"] = `약 ${L(Math.max(0, h.tank - h.level))}`;
    f["바우처 잔액(가상)"] = won(h.voucher);
    if (h.voucher > 0) {
      f["바우처로 살 수 있는 양"] = `약 ${L(h.voucher / h.dealerPrice)}`;
      if (h.voucherDays != null) f["바우처로 버티는 기간"] = `약 ${h.voucherDays}일${h.voucherUntil ? `, ${fmtDate(h.voucherUntil)}쯤까지` : ""}`;
    }
  }
  return f;
}

// Gemini가 없거나 숫자가 맞지 않을 때 쓰는 답. 사실 목록의 값만 쓴다
export function templateAnswer(topic: Topic, p: PriceFacts, h: HouseFacts | null, q = ""): string {
  const when = p.live ? `오피넷 ${p.asOf} 기준` : `오피넷 ${p.asOf} 저장 자료 기준`;
  const needHouse = "위 '가구'에서 집을 고르시면 그 집 계산으로 답해 드려요.";
  switch (topic) {
    case "alert": {
      const price = parsePriceRule(q);
      if (price) return `${p.emd} 등유가 ${perL(price)} 밑으로 내려가면 알려 드리는 조건으로 바꿨어요. 아래 [조건 저장]을 누르시면 알림 탭에 저장돼요.`;
      return h
        ? `기름이 떨어지기 전 알림은 이미 켜져 있어요. ${h.alertDate ? `${fmtDate(h.alertDate)}에 먼저 전화드리고, 못 받으시면 문자로 알려 드려요.` : "지금은 넉넉해서 당분간 전화할 일이 없어요."}`
        : `기름이 떨어지기 전 알림은 집마다 자동으로 켜져 있어요. ${needHouse}`;
    }
    case "cheapest":
      if (!p.emdCheapest && !p.ujuCheapest) return "지금 등유 가격을 불러오지 못했어요. 잠시 뒤 다시 물어봐 주세요.";
      return [
        p.emdCheapest
          ? `${p.emd}에서 등유가 가장 싼 곳은 ${p.emdCheapest.name}, ${perL(p.emdCheapest.price)}이에요(${when}).`
          : `${p.emd}에는 등유 가격을 올린 주유소가 없어요.`,
        p.ujuCheapest ? `울주군 전체로는 ${p.ujuCheapest.emd} ${josa(p.ujuCheapest.name, "이", "가")} ${perL(p.ujuCheapest.price)}으로 가장 싸요.` : "",
        h ? `늘 시키시던 ${josa(h.dealer, "은", "는")} ${perL(h.dealerPrice)}이에요.` : "",
        "주유소 가격이라 배달이 되는지는 따로 확인해야 해요.",
      ]
        .filter(Boolean)
        .join(" ");
    case "empty":
      if (!h) return `집마다 남은 기름을 날씨로 매일 다시 계산해요. ${needHouse}`;
      return h.emptyDate
        ? `제 계산으로는 지금 약 ${L(h.level)} 남았고, ${fmtDate(h.emptyDate)}쯤 떨어질 것 같아요. 앞으로 7일 동안 약 ${L(h.use7)} 쓰실 것 같아요.${h.alertDate ? (h.alertDate <= h.today ? " 지금 기름을 넣으실 때예요. 주문을 도와드릴까요?" : ` ${fmtDate(h.alertDate)}에 먼저 전화드릴게요.`) : ""}`
        : `제 계산으로는 지금 약 ${L(h.level)} 남았고, 이번 겨울 안에 떨어질 일은 없어 보여요.`;
    case "cold":
      if (!h) return `한파가 오면 기름을 더 많이 써요. ${needHouse}`;
      return h.coldDates.length
        ? `앞으로 7일 안에 ${dates(h.coldDates)} 한파 신호가 있어요. 앞으로 7일 쓸 양은 약 ${L(h.use7)}로, 지난 7일(약 ${L(h.usual7)})보다 많아요. 한파가 있으면 여유분을 넉넉히 잡아 더 일찍 전화드려요.`
        : `앞으로 7일 안에는 한파 신호가 없어요. 7일 쓸 양은 약 ${L(h.use7)}로, 지난 7일은 약 ${L(h.usual7)}였어요.`;
    case "voucher":
      if (!h) return `에너지바우처는 ${VOUCHER_UNTIL}까지 쓸 수 있어요. ${needHouse}`;
      return h.voucher > 0
        ? `바우처 잔액 ${won(h.voucher)}이면 ${h.dealer} 가격(${perL(h.dealerPrice)})으로 약 ${L(h.voucher / h.dealerPrice)}를 살 수 있어요.${h.voucherDays != null ? ` 이 집이 쓰는 양으로 약 ${h.voucherDays}일${h.voucherUntil ? `, ${fmtDate(h.voucherUntil)}쯤까지` : ""} 버틸 수 있어요.` : ""} 사용기한은 ${VOUCHER_UNTIL}이에요.`
        : `이 집은 바우처 잔액이 없는 것으로 되어 있어요. 대상인지는 주민센터나 생활지원사가 확인해 드려요. 사용기한은 ${VOUCHER_UNTIL}이에요.`;
    case "amount":
      if (!h) return `늘 시키시는 판매소 가격으로 계산해 드려요. ${needHouse}`;
      return `${h.dealer} 가격(${perL(h.dealerPrice)})으로 반 드럼(100L)은 ${won(100 * h.dealerPrice)}, 한 드럼(200L)은 ${won(200 * h.dealerPrice)}이에요. 지금 탱크에 들어갈 자리는 약 ${L(Math.max(0, h.tank - h.level))}예요.`;
    case "why":
      return [
        p.ujuAvg != null ? `울주군 등유 평균은 ${perL(p.ujuAvg)}이에요${p.ujuDiff != null ? `(${diffTxt(p.ujuDiff)})` : ""}.` : "",
        p.natAvg != null ? `전국 평균은 ${perL(p.natAvg)}이에요.` : "",
        `등유도 석유 최고가격 대상이라 정유사 공급가 상한이 ${perL(KEROSENE_CAP.price)}으로 묶여 있어요(${KEROSENE_CAP.note}). 이건 판매소 판매가의 상한은 아니에요.`,
        p.ujuAvg != null && p.emdCheapest ? `같은 동네 안에서도 ${p.emd} 최저가와 울주 평균이 ${(p.ujuAvg - p.emdCheapest.price).toFixed(1)}원 차이 나요.` : "",
        "국내 판매가는 보통 국제유가와 환율 변화를 2~3주 늦게 따라가요.",
      ]
        .filter(Boolean)
        .join(" ");
    case "pay":
      return "값은 배달 올 때 카드나 국민행복카드로 직접 내시면 돼요. 저는 돈이나 카드 번호를 묻지 않아요.";
    case "delivery":
      return "주문하시면 판매소가 확인 전화를 드리고, 보통 1~3일 안에 갖다 드려요.";
    default:
      return "그건 제가 가진 자료로는 정확히 답하기 어려워요. 등유 가격, 우리 집 기름이 떨어지는 날, 한파, 바우처, 배달·결제는 물어보실 수 있어요.";
  }
}

// 답 속 숫자 개수(화면의 '숫자 n개 · 대조해 일치'에 쓴다)
export const countNumbers = (text: string) => (text.replace(/,/g, "").match(/\d+(\.\d+)?/g) ?? []).length;

export const SUGGEST = {
  cards: ["우리 동네 제일 싼 등유 어디야?", "우리 집 기름 언제 떨어져?", "이번 주 한파 오면 얼마나 더 써?", "바우처로 얼마나 버틸 수 있어?"],
  chips: ["반 드럼 넣으면 얼마야?", "요즘 등유값 왜 이래?", "1,500원 밑으로 내려가면 알려 줘"],
};
