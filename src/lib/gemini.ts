// 서버 전용: Gemini REST 호출 (키는 GEMINI_API_KEY 환경 변수, 브라우저로 보내지 않음)

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export function hasGemini() {
  return !!process.env.GEMINI_API_KEY;
}

type Schema = Record<string, unknown>;

// 정해 둔 시간 안에 답이 없으면 포기한다(그때는 낱말 규칙·정해 둔 답을 쓴다).
// 2026-11-18 실제 사이트에서 4초 제한에 세 번 중 두 번 걸려(성공한 한 번은 2.8초), 전화 7초·물어보기 8초로 늘렸다
export async function geminiJSON<T>(system: string, user: string, schema: Schema, timeoutMs = 7000): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY 없음");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const ask = () =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0, // 같은 말에는 같은 답이 나오게
          maxOutputTokens: 400,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });
  try {
    let res = await ask();
    if (res.status === 503) res = await ask(); // "사용량 많음"은 한 번만 다시 묻는다. 두 번을 합쳐 timeoutMs 안에 끝낸다
    if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}
