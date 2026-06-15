import { ImageResponse } from "next/og";
import type { CSSProperties, ReactNode } from "react";
import { prisma } from "@/lib/db";
import { originalDataUri } from "@/lib/storage";
import { secondAttack, stageLevel, attackText } from "@/lib/cardgen";
import { loadCardFonts, CARD_FONT_FAMILY } from "@/lib/fonts";
import {
  ELEMENT_COLOR,
  GRADE_TONE,
  TYPE_META,
  RARITY_MARK,
  isShiny,
  isFullArt,
  type Element,
  type Grade,
} from "@/lib/types";

export const runtime = "nodejs";

const f = (extra: CSSProperties = {}): CSSProperties => ({ display: "flex", ...extra });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const ascii = (s: string | null | undefined, fb: string) =>
  s && /^[\x00-\x7F]+$/.test(s) ? s : fb;

function rngFrom(s: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RAINBOW =
  "linear-gradient(115deg, rgba(255,90,130,.0) 30%, rgba(255,210,60,.45) 42%, rgba(60,230,170,.45) 50%, rgba(80,180,255,.45) 58%, rgba(180,120,255,.0) 70%)";
const RAINBOW_FULL =
  "linear-gradient(125deg, rgba(255,90,130,.22), rgba(255,210,60,.28), rgba(60,230,170,.28), rgba(80,180,255,.28), rgba(180,120,255,.24))";

function sparkleField(seedKey: string, count: number): ReactNode {
  const rnd = rngFrom(seedKey + "::spark");
  const palette = ["#ffffff", "#FFE166", "#7AD7FF", "#FF7AD1", "#25E2AE"];
  const stars: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = rnd() * 100, y = rnd() * 100, s = 3 + rnd() * 11;
    const col = palette[Math.floor(rnd() * palette.length)];
    stars.push(
      <div key={i} style={f({ position: "absolute", left: `${x}%`, top: `${y}%`, width: s, height: s, background: col, transform: "rotate(45deg)", borderRadius: 1, opacity: 0.55 + rnd() * 0.4, boxShadow: `0 0 ${s * 1.4}px ${col}` })} />
    );
  }
  return <div style={f({ position: "absolute", inset: 0, overflow: "hidden" })}>{stars}</div>;
}

// 속성별 에너지 글리프 (흰색 SVG) — 포켓몬 에너지 아이콘 느낌의 고유 심볼
function glyph(el: Element, c: string): ReactNode {
  switch (el) {
    case "Aqua":
      return <path d="M12 3C12 3 5 11 5 15a7 7 0 0 0 14 0C19 11 12 3 12 3Z" fill="#fff" />;
    case "Flame":
      return <path d="M13 2c1 5 5 6 4 11a5 5 0 0 1-10 0c0-3 2-4 2-7c1 2 2 1 4-4Z" fill="#fff" />;
    case "Terra":
      return <polygon points="12,3 20,8 20,16 12,21 4,16 4,8" fill="#fff" />;
    case "Storm":
      return <polygon points="13,2 5,13 11,13 9,22 19,9 12,9" fill="#fff" />;
    case "Neon":
      return <polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" fill="#fff" />;
    case "Metal":
      return <polygon points="12,2 22,12 12,22 2,12" fill="#fff" />;
    case "Spirit":
      return <g><circle cx="12" cy="12" r="9" fill="#fff" /><circle cx="12" cy="12" r="4.5" fill={c} /></g>;
    case "Solar":
      return <g><circle cx="12" cy="12" r="5.5" fill="#fff" /><polygon points="12,1 13.5,5 10.5,5" fill="#fff" /><polygon points="12,23 13.5,19 10.5,19" fill="#fff" /><polygon points="1,12 5,13.5 5,10.5" fill="#fff" /><polygon points="23,12 19,13.5 19,10.5" fill="#fff" /></g>;
    case "Shadow":
      return <g><circle cx="12" cy="12" r="9" fill="#fff" /><circle cx="15.5" cy="10" r="7.5" fill={c} /></g>;
    case "Lunar":
      return <g><circle cx="12" cy="12" r="9" fill="#fff" /><circle cx="9" cy="10.5" r="7.5" fill={c} /></g>;
    default:
      return <circle cx="12" cy="12" r="7" fill="#fff" />;
  }
}

function typeIcon(el: Element, size: number): ReactNode {
  const c = ELEMENT_COLOR[el] ?? "#888";
  return (
    <div style={f({ width: size, height: size, borderRadius: size, background: c, alignItems: "center", justifyContent: "center", border: "2px solid rgba(0,0,0,0.3)", boxShadow: "0 1px 2px rgba(0,0,0,0.4)" })}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">{glyph(el, c)}</svg>
    </div>
  );
}

function colorlessIcon(size: number): ReactNode {
  return (
    <div style={f({ width: size, height: size, borderRadius: size, background: "#c8ccd6", alignItems: "center", justifyContent: "center", border: "2px solid rgba(0,0,0,0.3)" })}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#fff" /></svg>
    </div>
  );
}

const FLAVOR_KO: Record<Element, string> = {
  Aqua: "깊은 물결 속에서 태어난 카드. 차분하지만 거센 힘을 품는다.",
  Flame: "타오르는 의지를 담은 카드. 결코 꺼지지 않는다.",
  Terra: "대지의 단단함을 물려받은 카드. 흔들리지 않는다.",
  Storm: "휘몰아치는 전류를 두른 카드. 순식간에 모든 것을 휩쓴다.",
  Neon: "빛의 파장으로 빚어진 카드. 어둠 속에서 더 선명하다.",
  Shadow: "그림자에서 모습을 드러낸 카드. 그 끝을 가늠하기 어렵다.",
  Metal: "단조된 금속의 카드. 어떤 충격에도 굴하지 않는다.",
  Spirit: "영혼의 울림을 담은 카드. 마음을 공명시킨다.",
  Solar: "태양의 파편을 머금은 카드. 눈부신 열기를 발한다.",
  Lunar: "달빛을 두른 카드. 고요함 속에 강한 힘이 흐른다.",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const card = await prisma.card.findUnique({ where: { id }, include: { user: true } });
  if (!card || card.status === "deleted" || !card.grade) {
    return new Response("Not found", { status: 404 });
  }

  const fonts = await loadCardFonts();
  const ko = fonts.length > 0;
  const L = ko
    ? { weak: "약점", resist: "저항력", retreat: "후퇴", ability: "특성", cat: "분류", illus: "일러스트" }
    : { weak: "Weakness", resist: "Resistance", retreat: "Retreat", ability: "Ability", cat: "Category", illus: "Illus." };

  const grade = card.grade as Grade;
  const type = card.element as Element;
  const typeColor = ELEMENT_COLOR[type] ?? "#39ffd0";
  const meta = TYPE_META[type];
  const tone = GRADE_TONE[grade];
  const accent = tone?.accent ?? "#F5C400";
  const hp = card.pwr ?? 60;
  const photo = await originalDataUri(card.originalImagePath);
  const name = ko ? card.user.nickname ?? "이름없는 카드" : ascii(card.user.nickname, "UNNAMED");

  const seed = parseInt(card.id.slice(0, 6), 16);
  const attackCost = clamp(Math.round((card.skillPower ?? 30) / 40), 1, 3);
  const retreat = clamp(Math.round(hp / 90), 1, 4);
  const dexNo = (seed % 999) + 1;
  const height = (0.3 + (seed % 25) / 10).toFixed(1);
  const weight = (1 + (seed % 90)).toFixed(1);
  const flavor = ko ? FLAVOR_KO[type] : "Born from raw energy, this card carries a quiet, unyielding power.";
  const lvl = stageLevel(card.score ?? 0);
  const stageLabel = ko ? ["기본", "1진화", "2진화"][lvl] : ["BASIC", "STAGE 1", "STAGE 2"][lvl];
  const atk2 = secondAttack(type, card.id, card.score ?? 0);
  const fx1 = attackText(card.id, 1, ko);
  const fx2 = attackText(card.id, 2, ko);

  const shiny = isShiny(grade);
  const fullart = isFullArt(grade);
  const sparkleCount = grade === "SSR" ? 30 : grade === "SR" ? 24 : grade === "AR" ? 20 : 14;

  const W = 600, H = 840;
  const fontFamily = ko ? CARD_FONT_FAMILY : "sans-serif";
  const fontsOpt = fonts.length
    ? fonts.map((ft) => ({ name: ft.name, data: ft.data, weight: ft.weight, style: ft.style }))
    : undefined;

  const mk = RARITY_MARK[grade] ?? { kind: "circle" as const, count: 1, color: "#A6AEC6" };
  const markSvg = (sz: number) => {
    if (mk.kind === "circle") return <svg width={sz} height={sz} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill={mk.color} /></svg>;
    if (mk.kind === "diamond") return <svg width={sz} height={sz} viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill={mk.color} /></svg>;
    return <svg width={sz} height={sz} viewBox="0 0 24 24"><polygon points="12,1.5 15,9 22.5,9 16.3,13.8 18.5,21.5 12,16.8 5.5,21.5 7.7,13.8 1.5,9 9,9" fill={mk.color} /></svg>;
  };
  const rarityStars = (
    <div style={f({ alignItems: "center", gap: 2 })}>
      {Array.from({ length: mk.count }).map((_, i) => (<div key={i} style={f()}>{markSvg(14)}</div>))}
    </div>
  );
  // 세트 아이콘 + 레귤레이션 마크
  const setIcon = (
    <svg width={13} height={13} viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
  );
  const regBox = (
    <div style={f({ border: "1px solid currentColor", borderRadius: 3, padding: "0 3px", fontSize: 9, fontWeight: 700 })}>H</div>
  );

  const texture = (
    <div style={f({ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(48deg, rgba(255,255,255,.07) 0px, rgba(255,255,255,.07) 2px, rgba(255,255,255,0) 2px, rgba(255,255,255,0) 8px)" })} />
  );
  const exBadge = (
    <div style={f({ alignItems: "center", background: grade === "SSR" ? "linear-gradient(135deg,#FFE166,#F5C400)" : "linear-gradient(135deg,#ffffff,#cfd4e2)", color: "#10101a", fontSize: 20, fontWeight: 700, fontStyle: "italic", padding: "0 9px", borderRadius: 6, boxShadow: "0 2px 6px rgba(0,0,0,.5)" })}>ex</div>
  );
  const tagBadge = (
    <div style={f({ alignItems: "center", background: accent, color: "#10101a", fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: "2px 8px", borderRadius: 4 })}>TAG TEAM</div>
  );
  const gradeBadge = (
    <div style={f({ alignItems: "center", gap: 6, background: accent, color: "#0c0c12", fontWeight: 700, fontSize: 15, padding: "3px 10px", borderRadius: 8, border: shiny ? "1px solid rgba(255,255,255,0.6)" : "none" })}>{grade}</div>
  );

  // ============================================================
  // 풀아트 (SR / AR / ASR / SSR)
  // ============================================================
  if (fullart) {
    return new ImageResponse(
      (
        <div style={f({ width: W, height: H, padding: 10, background: "linear-gradient(145deg,#f4d24c,#d9b020 50%,#8a6f18)", borderRadius: 20, fontFamily })}>
          <div style={f({ flex: 1, flexDirection: "column", position: "relative", borderRadius: 14, overflow: "hidden", border: "2px solid rgba(0,0,0,0.4)" })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={f({ position: "absolute", inset: 0, background: RAINBOW_FULL })} />
            {texture}
            {sparkleField(card.id, sparkleCount)}
            {/* 스크림은 상·하단만 (아트 가시성↑) */}
            <div style={f({ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,9,18,.5) 0%, rgba(5,9,18,0) 20%, rgba(5,9,18,0) 60%, rgba(5,9,18,.82) 100%)" })} />

            <div style={f({ position: "absolute", top: 8, left: 8, width: 40, height: 40, borderTop: `4px solid ${accent}`, borderLeft: `4px solid ${accent}`, borderTopLeftRadius: 8 })} />
            <div style={f({ position: "absolute", top: 8, right: 8, width: 40, height: 40, borderTop: `4px solid ${accent}`, borderRight: `4px solid ${accent}`, borderTopRightRadius: 8 })} />
            <div style={f({ position: "absolute", bottom: 8, left: 8, width: 40, height: 40, borderBottom: `4px solid ${accent}`, borderLeft: `4px solid ${accent}`, borderBottomLeftRadius: 8 })} />
            <div style={f({ position: "absolute", bottom: 8, right: 8, width: 40, height: 40, borderBottom: `4px solid ${accent}`, borderRight: `4px solid ${accent}`, borderBottomRightRadius: 8 })} />

            <div style={f({ position: "relative", flexDirection: "column", flex: 1, padding: 18, justifyContent: "space-between" })}>
              <div style={f({ flexDirection: "column", gap: 6 })}>
                <div style={f({ alignItems: "center", gap: 8 })}>
                  <div style={f({ fontSize: 12, color: "#fff", fontWeight: 700, background: "rgba(0,0,0,.45)", padding: "2px 8px", borderRadius: 4 })}>{stageLabel}</div>
                  {grade === "SSR" && tagBadge}
                  {gradeBadge}
                </div>
                <div style={f({ justifyContent: "space-between", alignItems: "flex-end" })}>
                  <div style={f({ alignItems: "center", gap: 8 })}>
                    <div style={f({ fontSize: 34, fontWeight: 700, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,.8)" })}>{name}</div>
                    {exBadge}
                  </div>
                  <div style={f({ alignItems: "center", gap: 6 })}>
                    <div style={f({ fontSize: 14, fontWeight: 700, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.9)" })}>HP</div>
                    <div style={f({ fontSize: 32, fontWeight: 700, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.9)" })}>{String(hp)}</div>
                    {typeIcon(type, 30)}
                  </div>
                </div>
              </div>

              <div style={f({ flexDirection: "column", gap: 7, background: "rgba(5,9,18,.5)", borderRadius: 10, padding: "11px 14px", border: "1px solid rgba(255,255,255,.14)" })}>
                <div style={f({ alignItems: "center", gap: 8 })}>
                  <div style={f({ background: "#c0392b", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4 })}>{L.ability}</div>
                  <div style={f({ fontSize: 16, fontWeight: 700, color: "#ffe08a" })}>{card.passiveName}</div>
                </div>
                <div style={f({ flexDirection: "column" })}>
                  <div style={f({ alignItems: "center", justifyContent: "space-between" })}>
                    <div style={f({ alignItems: "center", gap: 6 })}>
                      {Array.from({ length: attackCost }).map((_, i) => (<div key={i} style={f()}>{typeIcon(type, 22)}</div>))}
                      <div style={f({ fontSize: 18, fontWeight: 700, color: "#fff", marginLeft: 4 })}>{card.skillName}</div>
                    </div>
                    <div style={f({ fontSize: 24, fontWeight: 700, color: "#fff" })}>{String(card.skillPower)}</div>
                  </div>
                  <div style={f({ fontSize: 11, color: "#dfe3ee", marginTop: 3, lineHeight: 1.35 })}>{fx1}</div>
                </div>
                <div style={f({ justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#cfd4e2", borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 6 })}>
                  <div style={f({ alignItems: "center", gap: 5, color: "#cfd4e2" })}>{setIcon}<div style={f()}>{`${L.illus}. ${ascii(card.user.nickname, "AI")}`}</div></div>
                  <div style={f({ alignItems: "center", gap: 6, color: "#cfd4e2" })}>
                    <div style={f()}>{`${card.id.slice(0, 3).toUpperCase()} ${String(dexNo).padStart(3, "0")}/999`}</div>
                    {rarityStars}
                    <div style={f({ fontWeight: 700, color: accent })}>{grade}</div>
                    {regBox}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      { width: W, height: H, fonts: fontsOpt }
    );
  }

  // ============================================================
  // 스탠다드 (D / C / B / A / R) — R 은 홀로/스파클
  // ============================================================
  const cardBg = `linear-gradient(165deg, ${typeColor}55, #14141d 45%, #0e0e16 100%)`;
  const artFrame = `linear-gradient(145deg, ${typeColor}, ${typeColor}88)`;
  return new ImageResponse(
    (
      <div style={f({ width: W, height: H, padding: 16, background: "linear-gradient(145deg, #f4d24c, #d9b020 55%, #b8902a)", borderRadius: 22, fontFamily })}>
        <div style={f({ flex: 1, flexDirection: "column", background: cardBg, borderRadius: 12, padding: 14, border: `3px solid ${typeColor}`, position: "relative", overflow: "hidden" })}>
          {shiny && <div style={f({ position: "absolute", inset: 0, background: RAINBOW })} />}
          {shiny && texture}
          {shiny && sparkleField(card.id, sparkleCount)}

          <div style={f({ flexDirection: "column", position: "relative" })}>
            <div style={f({ fontSize: 13, color: "#f4f4f6", fontWeight: 700 })}>{stageLabel}</div>
            <div style={f({ justifyContent: "space-between", alignItems: "flex-end", marginTop: 2 })}>
              <div style={f({ fontSize: 30, fontWeight: 700, color: "#fff" })}>{name}</div>
              <div style={f({ alignItems: "center", gap: 6 })}>
                <div style={f({ fontSize: 14, fontWeight: 700, color: "#ffd0d0" })}>HP</div>
                <div style={f({ fontSize: 30, fontWeight: 700, color: "#fff" })}>{String(hp)}</div>
                {typeIcon(type, 30)}
              </div>
            </div>
          </div>

          {/* 타입 컬러 프레임 밴드 + 아트 */}
          <div style={f({ marginTop: 8, padding: 6, background: artFrame, borderRadius: 8, position: "relative" })}>
            <div style={f({ height: 282, borderRadius: 4, overflow: "hidden", border: "1px solid rgba(0,0,0,0.45)" })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} width={520} height={282} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>

          <div style={f({ marginTop: 6, padding: "4px 10px", background: "rgba(0,0,0,0.35)", borderRadius: 6, fontSize: 11, color: "#e8e8ee", justifyContent: "space-between", position: "relative" })}>
            <div style={f()}>{`No.${String(dexNo).padStart(3, "0")} · ${type} ${L.cat}`}</div>
            <div style={f()}>{`${height} m · ${weight} kg`}</div>
          </div>

          <div style={f({ marginTop: 8, flexDirection: "column", background: "rgba(0,0,0,0.28)", borderRadius: 8, padding: "8px 10px", position: "relative" })}>
            <div style={f({ alignItems: "center", gap: 8 })}>
              <div style={f({ background: "#c0392b", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4 })}>{L.ability}</div>
              <div style={f({ fontSize: 17, fontWeight: 700, color: "#ffe08a" })}>{card.passiveName}</div>
            </div>
          </div>

          {/* 기술 1 + 설명 */}
          <div style={f({ marginTop: 8, flexDirection: "column", background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 10px", position: "relative" })}>
            <div style={f({ alignItems: "center", justifyContent: "space-between" })}>
              <div style={f({ alignItems: "center", gap: 6 })}>
                {Array.from({ length: attackCost }).map((_, i) => (<div key={i} style={f()}>{typeIcon(type, 24)}</div>))}
                <div style={f({ fontSize: 20, fontWeight: 700, color: "#fff", marginLeft: 4 })}>{card.skillName}</div>
              </div>
              <div style={f({ fontSize: 26, fontWeight: 700, color: "#fff" })}>{String(card.skillPower)}</div>
            </div>
            <div style={f({ fontSize: 11, color: "#d6dae6", marginTop: 3, lineHeight: 1.35 })}>{fx1}</div>
          </div>

          {/* 기술 2 + 설명 */}
          <div style={f({ marginTop: 6, flexDirection: "column", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 6, position: "relative" })}>
            <div style={f({ alignItems: "center", justifyContent: "space-between" })}>
              <div style={f({ alignItems: "center", gap: 6 })}>
                {Array.from({ length: atk2.cost }).map((_, i) => (<div key={i} style={f()}>{typeIcon(type, 22)}</div>))}
                <div style={f({ fontSize: 18, fontWeight: 700, color: "#f0f0f5", marginLeft: 4 })}>{atk2.name}</div>
              </div>
              <div style={f({ fontSize: 22, fontWeight: 700, color: "#f0f0f5" })}>{String(atk2.damage)}</div>
            </div>
            <div style={f({ fontSize: 11, color: "#d6dae6", marginTop: 3, lineHeight: 1.35 })}>{fx2}</div>
          </div>

          {/* 약점/저항/후퇴 */}
          <div style={f({ marginTop: 8, justifyContent: "space-between", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "6px 12px", position: "relative" })}>
            <div style={f({ flexDirection: "column", alignItems: "center", gap: 2 })}>
              <div style={f({ fontSize: 10, color: "#cfcfe0" })}>{L.weak}</div>
              <div style={f({ alignItems: "center", gap: 4 })}>{typeIcon(meta.weakTo, 20)}<div style={f({ fontSize: 13, color: "#fff" })}>×2</div></div>
            </div>
            <div style={f({ flexDirection: "column", alignItems: "center", gap: 2 })}>
              <div style={f({ fontSize: 10, color: "#cfcfe0" })}>{L.resist}</div>
              <div style={f({ alignItems: "center", gap: 4 })}>{typeIcon(meta.resistTo, 20)}<div style={f({ fontSize: 13, color: "#fff" })}>-30</div></div>
            </div>
            <div style={f({ flexDirection: "column", alignItems: "center", gap: 2 })}>
              <div style={f({ fontSize: 10, color: "#cfcfe0" })}>{L.retreat}</div>
              <div style={f({ alignItems: "center", gap: 3 })}>
                {Array.from({ length: retreat }).map((_, i) => (<div key={i} style={f()}>{colorlessIcon(18)}</div>))}
              </div>
            </div>
          </div>

          <div style={f({ marginTop: 8, flex: 1, alignItems: "flex-end", position: "relative" })}>
            <div style={f({ fontSize: 11, color: "#e2e2ea", fontStyle: "italic", lineHeight: 1.4 })}>{flavor}</div>
          </div>

          <div style={f({ marginTop: 6, justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#e8e8ee", position: "relative" })}>
            <div style={f({ alignItems: "center", gap: 5, color: "#e8e8ee" })}>{setIcon}<div style={f()}>{`${L.illus}. ${ascii(card.user.nickname, "AI")}`}</div></div>
            <div style={f({ alignItems: "center", gap: 6, color: "#e8e8ee" })}>
              <div style={f()}>{`${card.id.slice(0, 3).toUpperCase()} ${String(dexNo).padStart(3, "0")}/999`}</div>
              {rarityStars}
              <div style={f({ fontWeight: 700 })}>{grade}</div>
              {regBox}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: fontsOpt }
  );
}
