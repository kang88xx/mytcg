// 마이TCG — 공유 타입/상수 (docs/PRD.md, DESIGN_GUIDE.md 기준)

export const SCORING_VERSION = "heuristic-v1";

// 등급 체계 (낮음 → 높음): D C B A R AR ASR SR SSR
export type Grade = "D" | "C" | "B" | "A" | "R" | "AR" | "ASR" | "SR" | "SSR";
export const GRADES_ASC: Grade[] = ["D", "C", "B", "A", "R", "AR", "ASR", "SR", "SSR"];
export function gradeRank(g: Grade): number {
  return GRADES_ASC.indexOf(g);
}
// R 이상 = 반짝임(홀로/스파클), ASR 이상 = 풀아트 레이아웃
export function isShiny(g: Grade): boolean {
  return gradeRank(g) >= gradeRank("R");
}
export function isFullArt(g: Grade): boolean {
  return gradeRank(g) >= gradeRank("ASR");
}

export type Rarity =
  | "Secret Rare"
  | "Super Rare"
  | "Special Art Rare"
  | "Art Rare"
  | "Double Rare"
  | "Rare"
  | "Uncommon"
  | "Common"
  | "Base";

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

// 등급 매핑 테이블 (점수 → 등급/희귀도). 상위로 갈수록 희귀.
export const GRADE_TABLE: { min: number; grade: Grade; rarity: Rarity }[] = [
  { min: 99, grade: "SSR", rarity: "Secret Rare" },
  { min: 96, grade: "SR", rarity: "Super Rare" },
  { min: 92, grade: "ASR", rarity: "Special Art Rare" },
  { min: 88, grade: "AR", rarity: "Art Rare" },
  { min: 80, grade: "R", rarity: "Double Rare" },
  { min: 70, grade: "A", rarity: "Rare" },
  { min: 58, grade: "B", rarity: "Uncommon" },
  { min: 42, grade: "C", rarity: "Common" },
  { min: 0, grade: "D", rarity: "Base" },
];

// 등급별 디자인 톤. accent = 카드/배지 강조색. R+는 홀로 처리.
export const GRADE_TONE: Record<Grade, { label: string; accent: string }> = {
  D: { label: "Base", accent: "#56607F" },
  C: { label: "Common", accent: "#A6AEC6" },
  B: { label: "Uncommon", accent: "#25E2AE" },
  A: { label: "Rare", accent: "#2DB4F2" },
  R: { label: "Double Rare", accent: "#7AD7FF" },
  AR: { label: "Art Rare", accent: "#F5C400" },
  ASR: { label: "Special Art Rare", accent: "#FFD42E" },
  SR: { label: "Super Rare", accent: "#B388FF" },
  SSR: { label: "Secret Rare", accent: "#FF7AD1" },
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
