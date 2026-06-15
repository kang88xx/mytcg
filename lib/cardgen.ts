import {
  GRADE_TABLE,
  ELEMENTS,
  type AnalysisResult,
  type Element,
  type Grade,
  type Rarity,
} from "./types";

export interface GeneratedCard {
  score: number;
  grade: Grade;
  rarity: Rarity;
  element: Element;
  pwr: number;
  skillName: string;
  skillPower: number;
  passiveName: string;
  frame: string;
}

// 결정적 시드 (imageHash 기반) — 같은 이미지는 같은 결과
function seedFrom(s: string): () => number {
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

function gradeFor(score: number): { grade: Grade; rarity: Rarity } {
  for (const row of GRADE_TABLE) {
    if (score >= row.min) return { grade: row.grade, rarity: row.rarity };
  }
  return { grade: "C", rarity: "Common" };
}

// 대표색(hex) → 속성. 밝기/색조 기반 매핑.
function elementFor(analysis: AnalysisResult, rnd: () => number): Element {
  const hex = analysis.dominantColors[0] ?? "#808080";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = max === 0 ? 0 : (max - min) / max;

  if (sat < 0.12) {
    // 무채색: 밝기로 분기
    if (luma < 60) return "Shadow";
    if (luma > 200) return "Metal";
    return rnd() > 0.5 ? "Lunar" : "Spirit";
  }
  // 색조(hue) 계산
  const h = hue(r, g, b);
  if (h < 20 || h >= 345) return "Flame";
  if (h < 45) return "Solar";
  if (h < 70) return luma > 180 ? "Solar" : "Terra";
  if (h < 160) return "Neon"; // green~teal
  if (h < 200) return "Aqua";
  if (h < 255) return "Aqua";
  if (h < 290) return "Storm";
  return "Spirit";
}

function hue(r: number, g: number, b: number): number {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

const SKILL_PREFIX: Record<Element, string[]> = {
  Aqua: ["Blue", "Tidal", "Abyss", "Frost"],
  Flame: ["Blaze", "Ember", "Scorch", "Solar"],
  Terra: ["Quake", "Stone", "Gaia", "Iron"],
  Storm: ["Cyclone", "Surge", "Volt", "Gale"],
  Neon: ["Pulse", "Laser", "Glitch", "Spectrum"],
  Shadow: ["Void", "Umbra", "Eclipse", "Phantom"],
  Metal: ["Chrome", "Titan", "Alloy", "Edge"],
  Spirit: ["Aura", "Soul", "Astral", "Echo"],
  Solar: ["Flare", "Radiant", "Helios", "Dawn"],
  Lunar: ["Crescent", "Moon", "Tide", "Silver"],
};
const SKILL_SUFFIX = ["Impact", "Burst", "Strike", "Wave", "Storm", "Break", "Drive"];
const PASSIVE_WORD = ["Focus", "Resonance", "Overclock", "Guard", "Flow", "Instinct"];

// 두 번째 기술 (결정적) — 렌더 표현용
export function secondAttack(element: Element, seedKey: string, baseScore: number) {
  const rnd = seedFrom(seedKey + "::atk2");
  const prefixes = SKILL_PREFIX[element];
  const name = `${prefixes[Math.floor(rnd() * prefixes.length)]} ${
    SKILL_SUFFIX[Math.floor(rnd() * SKILL_SUFFIX.length)]
  }`;
  const cost = 1 + Math.floor(rnd() * 2); // 1~2
  const damage = Math.round((baseScore * 0.5 + 10) / 10) * 10;
  return { name, cost, damage };
}

// 진화 스테이지 (점수 기반) — 0:기본 1:1진화 2:2진화
export function stageLevel(score: number): 0 | 1 | 2 {
  if (score >= 88) return 2;
  if (score >= 75) return 1;
  return 0;
}

export function generateCard(
  analysis: AnalysisResult,
  finalScore: number,
  seedKey: string
): GeneratedCard {
  const rnd = seedFrom(seedKey);
  const score = Math.round(finalScore * 10) / 10;
  const { grade, rarity } = gradeFor(score);
  const element = elementFor(analysis, rnd);

  // PWR = 60 + 품질점수×2 (60~260)
  const pwr = Math.max(60, Math.min(260, Math.round(60 + score * 2)));

  // 스킬 파워 = 품질×0.8 + 피사체 보너스(10~40), 10단위 반올림
  const subjectBonus = 10 + Math.round((analysis.subject / 100) * 30);
  const skillPower =
    Math.round((score * 0.8 + subjectBonus) / 10) * 10;

  const prefixes = SKILL_PREFIX[element];
  const skillName = `${prefixes[Math.floor(rnd() * prefixes.length)]} ${
    SKILL_SUFFIX[Math.floor(rnd() * SKILL_SUFFIX.length)]
  }`;
  const passiveName = `${prefixes[Math.floor(rnd() * prefixes.length)]} ${
    PASSIVE_WORD[Math.floor(rnd() * PASSIVE_WORD.length)]
  }`;

  // 프레임: 속성 우선, SSS+ 는 Prism
  const frame =
    grade === "SSS+"
      ? "Prism"
      : (["Aqua", "Shadow", "Solar", "Lunar", "Metal", "Neon"] as string[]).includes(
          element
        )
      ? element
      : "Neon";

  return {
    score,
    grade,
    rarity,
    element,
    pwr,
    skillName,
    skillPower,
    passiveName,
    frame,
  };
}
