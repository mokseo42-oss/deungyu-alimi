// Next의 경로 별칭 "@/…"를 Node 시험에서도 쓰기 위한 풀이. "@/data/ulju" → src/data/ulju.ts
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
  }
  return nextResolve(specifier, context);
}
