// 울주군 실내등유 가격 (오피넷 유가정보 API). 조회는 lib/opinet.ts
// - 울주군 최저가 20곳 + 울주군 평균 + 전국 평균
// - 키가 없거나 실패하면 live=false. 화면은 저장된 2026-09-19 자료를 씀
import { NextResponse } from "next/server";
import { getKerosene } from "@/lib/opinet";

export const revalidate = 3600; // 1시간. 오피넷 일일 호출 한도 고려

export async function GET() {
  return NextResponse.json(await getKerosene());
}
