// 카드 렌더(next/og)용 한글 폰트 로더.
// Pretendard(한글+라틴) TTF를 1회 fetch 후 메모리 캐시. 실패 시 빈 배열(라틴 폴백).

type FontCfg = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

// Noto Sans KR (한글+라틴) woff — satori는 woff 지원. fontsource CDN.
const FAMILY = "Noto Sans KR";
const FONT_URLS: { url: string; weight: 400 | 700 }[] = [
  { url: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.5/files/noto-sans-kr-korean-700-normal.woff", weight: 700 },
  { url: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.5/files/noto-sans-kr-korean-400-normal.woff", weight: 400 },
];

let cache: FontCfg[] | null = null;
let tried = false;

export const CARD_FONT_FAMILY = FAMILY;

export async function loadCardFonts(): Promise<FontCfg[]> {
  if (tried) return cache ?? [];
  tried = true;
  try {
    const fonts = await Promise.all(
      FONT_URLS.map(async ({ url, weight }) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`font ${res.status}`);
        return { name: FAMILY, data: await res.arrayBuffer(), weight, style: "normal" as const };
      })
    );
    cache = fonts;
  } catch (e) {
    console.error("[fonts] Korean font load failed, latin fallback:", e);
    cache = [];
  }
  return cache;
}
