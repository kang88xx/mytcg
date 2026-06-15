// 마이TCG — 공유 타입/상수 (docs/PRD.md, DESIGN_GUIDE.md 기준)

export const SCORING_VERSION = "heuristic-v1";

export type Grade = "SSS+" | "SSS" | "SS" | "S" | "A" | "B" | "C";
export type Rarity =
  | "Mythic"
  | "Legendary"
  | "Ultra Rare"
  | "Super Rare"
  | "Rare"
  | "Uncommon"
  | "Common";

// 자체 속성 명칭 (포켓몬 에너지 미사용)
export const ELEMENTS = [
  "Aqua",
  "Flame",
  "Terra",
  "Storm",
  "Neon",
  "Shadow",
  "Metal",
  "Spirit",
  "Solar",
  "Lunar",
] as const;
export type Element = (typeof ELEMENTS)[number];

export type CardStatus =
  | "processing"
  | "active"
  | "hidden"
  | "reported"
  | "blocked"
  | "deleted"
  | "rank_excluded";

export type SharePlatform =
  | "kakao"
  | "instagram_story"
  | "instagram_feed"
  | "facebook"
  | "link"
  | "download";

export type ShareAction = "click" | "success" | "fail" | "view" | "install";

export type LeaderboardPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "all_time"
  | "event";

// 분석 결과 (항목별 0~100)
export interface AnalysisResult {
  sharpness: number;
  brightness: number;
  resolution: number;
  composition: number;
  subject: number;
  color: number;
  finalScore: number; // 0~100 (패널티 적용 전 합산)
  detectedSubjectType: string | null;
  dominantColors: string[];
  penaltyReasons: string[];
}

// 등급 매핑 테이블 (docs/PRD.md §7)
export const GRADE_TABLE: { min: number; grade: Grade; rarity: Rarity }[] = [
  { min: 97, grade: "SSS+", rarity: "Mythic" },
  { min: 93, grade: "SSS", rarity: "Legendary" },
  { min: 88, grade: "SS", rarity: "Ultra Rare" },
  { min: 80, grade: "S", rarity: "Super Rare" },
  { min: 70, grade: "A", rarity: "Rare" },
  { min: 55, grade: "B", rarity: "Uncommon" },
  { min: 0, grade: "C", rarity: "Common" },
];

// 등급별 디자인 톤 (DESIGN_GUIDE §4)
export const GRADE_TONE: Record<Grade, { label: string; accent: string }> = {
  "SSS+": { label: "Mythic", accent: "#b388ff" },
  SSS: { label: "Legendary", accent: "#ffd54a" },
  SS: { label: "Ultra Rare", accent: "#c0c8d8" },
  S: { label: "Super Rare", accent: "#4ad8ff" },
  A: { label: "Rare", accent: "#5cff9d" },
  B: { label: "Uncommon", accent: "#9aa0b0" },
  C: { label: "Common", accent: "#6b7280" },
};

// 속성별 색상 (DESIGN_GUIDE §7)
export const ELEMENT_COLOR: Record<Element, string> = {
  Aqua: "#3aa0ff",
  Flame: "#ff5a36",
  Terra: "#c9a24a",
  Storm: "#8a7bff",
  Neon: "#39ffd0",
  Shadow: "#7a5cff",
  Metal: "#9fb0c8",
  Spirit: "#ff7ad1",
  Solar: "#ffb43a",
  Lunar: "#9cc7ff",
};

export const FRAMES = [
  "Prism",
  "Neon",
  "Aqua",
  "Shadow",
  "Solar",
  "Lunar",
  "Metal",
  "Event Limited",
] as const;

// 카드 렌더용 타입 메타 (에너지 심볼 이니셜 + 약점/저항)
export const TYPE_META: Record<
  Element,
  { initial: string; weakTo: Element; resistTo: Element }
> = {
  Aqua: { initial: "A", weakTo: "Neon", resistTo: "Flame" },
  Flame: { initial: "F", weakTo: "Aqua", resistTo: "Metal" },
  Terra: { initial: "T", weakTo: "Flame", resistTo: "Storm" },
  Storm: { initial: "S", weakTo: "Terra", resistTo: "Metal" },
  Neon: { initial: "N", weakTo: "Shadow", resistTo: "Spirit" },
  Shadow: { initial: "D", weakTo: "Spirit", resistTo: "Lunar" },
  Metal: { initial: "M", weakTo: "Flame", resistTo: "Spirit" },
  Spirit: { initial: "P", weakTo: "Shadow", resistTo: "Neon" },
  Solar: { initial: "O", weakTo: "Lunar", resistTo: "Terra" },
  Lunar: { initial: "L", weakTo: "Solar", resistTo: "Shadow" },
};
