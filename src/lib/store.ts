"use client";
// 시연용 상태 저장소. 브라우저 localStorage에만 저장되고 서버로 가지 않는다.
// 같은 브라우저의 다른 탭(AI 전화 ↔ 판매소 ↔ 현황판)과 실시간으로 맞춰진다.
import { useSyncExternalStore } from "react";

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

export type FamilyMsg = { id: string; hid: string; at: string; text: string; orderId?: string };

export type State = {
  orders: Order[];
  deliveries: Record<string, { date: string; litersAfter: number }>;
  gauges: Record<string, { date: string; level: number }>;
  kOverride: Record<string, number>;
  logs: Log[];
  family: FamilyMsg[];
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

export function addFamily(hid: string, text: string, orderId?: string) {
  update((s) => ({ ...s, family: [{ id: uid(), hid, at: nowISO(), text, orderId }, ...s.family].slice(0, 100) }));
}

export const openOrder = (s: State, hid: string) =>
  s.orders.find((o) => o.hid === hid && o.status !== "배달 완료" && o.status !== "취소");
