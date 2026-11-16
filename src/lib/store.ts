"use client";
// 시연용 상태 저장소. 브라우저 localStorage에만 저장되고 서버로 가지 않는다.
// 같은 브라우저의 다른 탭(AI 전화 ↔ 판매소 ↔ 현황판)과 실시간으로 맞춰진다.
import { useSyncExternalStore } from "react";
import { Note, NoteCat, decideSend, kstStamp } from "./notify";

export type OrderStatus = "가족 승인 대기" | "접수" | "판매소 확인" | "배달 완료" | "취소";

export type Order = {
  id: string;
  hid: string;
  liters: number;
  price: number;
  dealer: string;
  via: string;
  createdAt: string; // ISO
  status: OrderStatus;
  delivered?: number;
};

export type LogKind = "주문" | "잔량 보정" | "참는 집 후보" | "확인 필요" | "안부 확인 필요" | "안내만" | "배달" | "지원 연결";

export type Log = { id: string; hid: string; at: string; kind: LogKind; text: string };

export type FamilyMsg = Note;

export type State = {
  orders: Order[];
  deliveries: Record<string, { date: string; litersAfter: number }>;
  gauges: Record<string, { date: string; level: number }>;
  kOverride: Record<string, number>;
  logs: Log[];
  family: FamilyMsg[];
  elder: FamilyMsg[]; // 어르신 본인이 받는 알림(문자, AI 스피커 알림 말)
  checks: Record<string, "요청" | "방문 배정" | "해결">;
  dealerPrices: Record<string, number>;
};

const KEY = "deungyu-alimi:v1";
const EMPTY: State = {
  orders: [],
  deliveries: {},
  gauges: {},
  kOverride: {},
  logs: [],
  family: [],
  elder: [],
  checks: {},
  dealerPrices: {},
};

let cache: State | null = null;
const listeners = new Set<() => void>();

function read(): State {
  if (cache) return cache;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

function write(next: State) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 저장이 막혀도 화면은 동작 */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export function useStore(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}

export function update(fn: (s: State) => State) {
  write(fn(read()));
}

export function resetDemo() {
  write(EMPTY);
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const nowISO = () => new Date().toISOString();

export function addLog(hid: string, kind: LogKind, text: string) {
  update((s) => ({ ...s, logs: [{ id: uid(), hid, at: nowISO(), kind, text }, ...s.logs].slice(0, 200) }));
}

// 알림을 만들 때 발송 규칙(lib/notify)을 거쳐 상태(보냄, 아침에 보냄, 안 보냄)를 함께 적는다
type NoteOpts = { kind: string; cat: NoteCat; orderId?: string; at?: string };

function addNote(list: "family" | "elder", hid: string, text: string, o: NoteOpts) {
  update((s) => {
    const prev = (s[list] ?? []) as Note[];
    const at = o.at ?? kstStamp();
    const d = decideSend({ hid, at, kind: o.kind, cat: o.cat, orderId: o.orderId }, prev);
    const note: Note = { id: uid(), hid, at, text, orderId: o.orderId, kind: o.kind, cat: o.cat, ...d };
    return { ...s, [list]: [note, ...prev].slice(0, 100) };
  });
}

export function addFamily(hid: string, text: string, o: NoteOpts) {
  addNote("family", hid, text, o);
}

// 어르신께 보내는 알림. 전화를 못 받으셨거나 통화 내용을 잊으셔도 다시 볼 수 있게 짧고 큰 글씨로
export function addElder(hid: string, text: string, o: NoteOpts) {
  addNote("elder", hid, text, o);
}

export const openOrder = (s: State, hid: string) =>
  s.orders.find((o) => o.hid === hid && o.status !== "배달 완료" && o.status !== "취소");
