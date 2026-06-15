import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { prisma } from "@/lib/db";
import { originalDataUri } from "@/lib/storage";
import { secondAttack, stageLevel } from "@/lib/cardgen";
import { loadCardFonts, CARD_FONT_FAMILY } from "@/lib/fonts";
import {
  ELEMENT_COLOR,
  GRADE_TONE,
  TYPE_META,
  type Element,
  type Grade,
} from "@/lib/types";

export const runtime = "nodejs";

const f = (extra: CSSProperties = {}): CSSProperties => ({ display: "flex", ...extra });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function ascii(s: string | null | undefined, fb: string) {
  if (!s) return fb;
  return /^[\x00-\x7F]+$/.test(s) ? s : fb;
}

// 에너지/타입 심볼 (색 원 + 이니셜)
function energy(color: string, ch: string, size = 26) {
  return (
    <div
      style={f({
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: Math.round(size * 0.5),
        fontWeight: 700,
        border: "2px solid rgba(0,0,0,0.3)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
      })}
    >
      {ch}
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
const FLAVOR_EN = "Born from raw energy, this card carries a quiet, unyielding power.";

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
    ? { stage: "기본", weak: "약점", resist: "저항력", retreat: "후퇴", ability: "특성", cat: "분류", illus: "일러스트" }
    : { stage: "BASIC", weak: "Weakness", resist: "Resistance", retreat: "Retreat", ability: "Ability", cat: "Category", illus: "Illus." };

  const type = card.element as Element;
  const typeColor = ELEMENT_COLOR[type] ?? "#39ffd0";
  const meta = TYPE_META[type];
  const tone = GRADE_TONE[card.grade as Grade];
  const hp = card.pwr ?? 60;
  const photo = await originalDataUri(card.originalImagePath);
  const name = ko ? card.user.nickname ?? "이름없는 카드" : ascii(card.user.nickname, "UNNAMED");

  // 파생 수치 (결정적)
  const seed = parseInt(card.id.slice(0, 6), 16);
  const attackCost = clamp(Math.round((card.skillPower ?? 30) / 40), 1, 3);
  const retreat = clamp(Math.round(hp / 90), 1, 4);
  const dexNo = (seed % 999) + 1;
  const height = (0.3 + (seed % 25) / 10).toFixed(1);
  const weight = (1 + (seed % 90)).toFixed(1);
  const flavor = ko ? FLAVOR_KO[type] : FLAVOR_EN;
  const isHolo = ["SSS+", "SSS", "SS"].includes(card.grade);

  // 진화 스테이지 + 두 번째 기술
  const lvl = stageLevel(card.score ?? 0);
  const stageLabel = ko
    ? ["기본", "1진화", "2진화"][lvl]
    : ["BASIC", "STAGE 1", "STAGE 2"][lvl];
  const atk2 = secondAttack(type, card.id, card.score ?? 0);

  // 타입별 카드 본체 그라디언트
  const cardBg = `linear-gradient(150deg, ${typeColor}cc, ${typeColor}55 40%, #1a1a22 100%)`;

  const W = 600;
  const H = 840;

  return new ImageResponse(
    (
      <div
        style={f({
          width: W,
          height: H,
          padding: 16,
          // 옐로/골드 테두리
          background: "linear-gradient(145deg, #f4d24c, #d9b020 55%, #b8902a)",
          borderRadius: 22,
          fontFamily: ko ? CARD_FONT_FAMILY : "sans-serif",
        })}
      >
        {/* 카드 본체 */}
        <div
          style={f({
            flex: 1,
            flexDirection: "column",
            background: cardBg,
            borderRadius: 12,
            padding: 14,
            border: `3px solid ${typeColor}`,
            position: "relative",
          })}
        >
          {/* 홀로 오버레이 */}
          {isHolo && (
            <div
              style={f({
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 12,
                background:
                  "linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 65%)",
              })}
            />
          )}

          {/* 상단: 스테이지 / 이름 / HP+타입 */}
          <div style={f({ flexDirection: "column" })}>
            <div style={f({ fontSize: 13, color: "#1a1a22", fontWeight: 700 })}>{stageLabel}</div>
            <div style={f({ justifyContent: "space-between", alignItems: "flex-end", marginTop: 2 })}>
              <div style={f({ fontSize: 30, fontWeight: 700, color: "#10101a" })}>{name}</div>
              <div style={f({ alignItems: "center", gap: 6 })}>
                <div style={f({ fontSize: 14, fontWeight: 700, color: "#7a1020" })}>HP</div>
                <div style={f({ fontSize: 30, fontWeight: 700, color: "#7a1020" })}>{String(hp)}</div>
                {energy(typeColor, meta.initial, 30)}
              </div>
            </div>
          </div>

          {/* 아트워크 윈도우 (골드 프레임) */}
          <div
            style={f({
              marginTop: 8,
              padding: 6,
              background: "linear-gradient(145deg, #f4d24c, #c79a22)",
              borderRadius: 8,
            })}
          >
            <div style={f({ height: 286, borderRadius: 4, overflow: "hidden", border: "1px solid rgba(0,0,0,0.4)" })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} width={520} height={286} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>

          {/* 도감 정보 바 */}
          <div
            style={f({
              marginTop: 6,
              padding: "4px 10px",
              background: "rgba(0,0,0,0.35)",
              borderRadius: 6,
              fontSize: 11,
              color: "#e8e8ee",
              justifyContent: "space-between",
            })}
          >
            <div style={f()}>{`No.${String(dexNo).padStart(3, "0")} · ${type} ${L.cat}`}</div>
            <div style={f()}>{`${height} m · ${weight} kg`}</div>
          </div>

          {/* 특성 (Ability) */}
          <div style={f({ marginTop: 8, flexDirection: "column", background: "rgba(0,0,0,0.28)", borderRadius: 8, padding: "8px 10px" })}>
            <div style={f({ alignItems: "center", gap: 8 })}>
              <div style={f({ background: "#c0392b", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4 })}>
                {L.ability}
              </div>
              <div style={f({ fontSize: 17, fontWeight: 700, color: "#ffe08a" })}>{card.passiveName}</div>
            </div>
          </div>

          {/* 기술 1 (Attack) */}
          <div style={f({ marginTop: 8, alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 10px" })}>
            <div style={f({ alignItems: "center", gap: 6 })}>
              {Array.from({ length: attackCost }).map((_, i) => (
                <div key={i} style={f()}>{energy(typeColor, meta.initial, 24)}</div>
              ))}
              <div style={f({ fontSize: 20, fontWeight: 700, color: "#fff", marginLeft: 4 })}>{card.skillName}</div>
            </div>
            <div style={f({ fontSize: 26, fontWeight: 700, color: "#fff" })}>{String(card.skillPower)}</div>
          </div>

          {/* 기술 2 (Attack) */}
          <div style={f({ marginTop: 6, alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 6 })}>
            <div style={f({ alignItems: "center", gap: 6 })}>
              {Array.from({ length: atk2.cost }).map((_, i) => (
                <div key={i} style={f()}>{energy(typeColor, meta.initial, 22)}</div>
              ))}
              <div style={f({ fontSize: 18, fontWeight: 700, color: "#f0f0f5", marginLeft: 4 })}>{atk2.name}</div>
            </div>
            <div style={f({ fontSize: 22, fontWeight: 700, color: "#f0f0f5" })}>{String(atk2.damage)}</div>
          </div>

          {/* 약점 / 저항력 / 후퇴 */}
          <div style={f({ marginTop: 8, justifyContent: "space-between", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "6px 12px" })}>
            <div style={f({ flexDirection: "column", alignItems: "center", gap: 2 })}>
              <div style={f({ fontSize: 10, color: "#cfcfe0" })}>{L.weak}</div>
              <div style={f({ alignItems: "center", gap: 4 })}>
                {energy(ELEMENT_COLOR[meta.weakTo], TYPE_META[meta.weakTo].initial, 20)}
                <div style={f({ fontSize: 13, color: "#fff" })}>×2</div>
              </div>
            </div>
            <div style={f({ flexDirection: "column", alignItems: "center", gap: 2 })}>
              <div style={f({ fontSize: 10, color: "#cfcfe0" })}>{L.resist}</div>
              <div style={f({ alignItems: "center", gap: 4 })}>
                {energy(ELEMENT_COLOR[meta.resistTo], TYPE_META[meta.resistTo].initial, 20)}
                <div style={f({ fontSize: 13, color: "#fff" })}>-30</div>
              </div>
            </div>
            <div style={f({ flexDirection: "column", alignItems: "center", gap: 2 })}>
              <div style={f({ fontSize: 10, color: "#cfcfe0" })}>{L.retreat}</div>
              <div style={f({ alignItems: "center", gap: 3 })}>
                {Array.from({ length: retreat }).map((_, i) => (
                  <div key={i} style={f()}>{energy("#b8b8c4", "", 18)}</div>
                ))}
              </div>
            </div>
          </div>

          {/* 플레이버 텍스트 */}
          <div style={f({ marginTop: 8, flex: 1, alignItems: "flex-end" })}>
            <div style={f({ fontSize: 11, color: "#e2e2ea", fontStyle: "italic", lineHeight: 1.4 })}>{flavor}</div>
          </div>

          {/* 하단 크레딧 */}
          <div style={f({ marginTop: 6, justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#e8e8ee" })}>
            <div style={f()}>{`${L.illus}. ${ascii(card.user.nickname, "AI") }`}</div>
            <div style={f({ alignItems: "center", gap: 6 })}>
              <div style={f()}>{`${card.id.slice(0, 3).toUpperCase()} ${String(dexNo).padStart(3, "0")}/250`}</div>
              <div style={f({ width: 12, height: 12, borderRadius: 12, background: tone?.accent ?? "#fff" })} />
              <div style={f({ fontWeight: 700 })}>{card.grade}</div>
              <div style={f({ border: "1px solid #e8e8ee", borderRadius: 3, padding: "0 3px" })}>H</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fonts.length
        ? fonts.map((ft) => ({ name: ft.name, data: ft.data, weight: ft.weight, style: ft.style }))
        : undefined,
    }
  );
}
