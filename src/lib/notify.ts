// 알림 발송 규칙. 기름알리미의 알림 엔진과 같은 규칙을 쓴다.
// - 밤 9시부터 아침 8시까지는 보내지 않고 아침 8시로 미룬다
// - 같은 알림은 한 번만
// - 한 사람에게 '안내' 알림은 하루 2건까지
// - 받는 사람이 메시지 안에서 바로 수신 거부할 수 있다
// - AI가 만든 문장은 숫자를 모델 값과 대조해, 다르면 보내지 않는다(/api/chat의 numbersOk)
//
// 알림 종류(cat)
// - 안내: 먼저 알려 드리는 것(기름이 곧 떨어짐 등). 위 규칙을 모두 따른다
// - 확인: 어르신이나 가족이 한 일에 대한 답(주문 접수, 가족 승인, 배달 완료). 밤에는 미루지만 하루 건수에는 세지 않는다
// - 긴급: 몸이 안 좋다, 보일러가 꺼졌다, 두 번 전화를 안 받으셨다. 시간과 건수에 막히지 않고 바로 보낸다(같은 날 같은 알림은 한 번)
// 시각은 모두 한국 시각 "YYYY-MM-DDTHH:mm" 문자열로 다룬다.

export const SEND_RULES = { quietFrom: 21, quietTo: 8, perDay: 2 };

export type NoteCat = "안내" | "확인" | "긴급";
export type NoteStatus = "보냄" | "아침에 보냄" | "같은 알림이라 안 보냄" | "하루 2건이 넘어 안 보냄";
export const DELIVERED: NoteStatus[] = ["보냄", "아침에 보냄"];

export type Note = {
  id: string;
  hid: string;
  at: string; // 알림이 생긴 시각
  text: string;
  orderId?: string;
  kind?: string; // 같은 알림인지 가리는 이름(예: "소진 예상", "주문")
  cat?: NoteCat;
  status?: NoteStatus;
  sendAt?: string; // 실제로 보내는(보낸) 시각
};

const pad = (n: number) => String(n).padStart(2, "0");

export function kstStamp(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600_000);
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}T${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
}

export function stampAt(date: string, hour: number, minute = 0) {
  return `${date}T${pad(Math.floor(hour))}:${pad(minute)}`;
}

function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// 조용한 시간이면 다음 아침 8시, 아니면 그대로
export function morningIfQuiet(at: string) {
  const date = at.slice(0, 10);
  const hour = Number(at.slice(11, 13));
  if (hour >= SEND_RULES.quietFrom) return stampAt(nextDay(date), SEND_RULES.quietTo);
  if (hour < SEND_RULES.quietTo) return stampAt(date, SEND_RULES.quietTo);
  return at;
}

// 이미 보낸(보낼) 알림 목록(같은 받는 사람)을 보고 이번 알림을 어떻게 할지 정한다
export function decideSend(
  n: { hid: string; at: string; kind: string; cat: NoteCat; orderId?: string },
  sameRecipient: Note[],
): { status: NoteStatus; sendAt?: string } {
  const live = sameRecipient.filter((x) => x.hid === n.hid && (!x.status || DELIVERED.includes(x.status)));
  // 긴급은 밤이든 몇 건째든 바로 보낸다(같은 날 같은 긴급 알림만 거른다)
  const sendAt = n.cat === "긴급" ? n.at : morningIfQuiet(n.at);
  const day = sendAt.slice(0, 10);
  const dayOf = (x: Note) => (x.sendAt ?? x.at).slice(0, 10);

  // 같은 알림: 주문에 딸린 알림은 주문마다 한 번, 그 밖의 알림은 하루 한 번
  const dup = live.some((x) => x.kind === n.kind && (n.orderId ? x.orderId === n.orderId : dayOf(x) === day));
  if (dup) return { status: "같은 알림이라 안 보냄" };
  if (n.cat === "긴급") return { status: "보냄", sendAt };

  if (n.cat === "안내") {
    const today = live.filter((x) => (x.cat ?? "안내") === "안내" && dayOf(x) === day).length;
    if (today >= SEND_RULES.perDay) return { status: "하루 2건이 넘어 안 보냄" };
  }
  return { status: sendAt === n.at ? "보냄" : "아침에 보냄", sendAt };
}

// 메시지 끝에 붙는 수신 거부 안내. 문자는 답장으로, 알림톡은 채널 차단으로
export const OPT_OUT = {
  문자: "그만 받으시려면 '그만'이라고 답장 주세요",
  알림톡: "알림을 그만 받으려면 채널을 차단하세요",
  "AI 스피커": "그만 들으시려면 '알림 그만'이라고 말씀하세요",
} as const;
