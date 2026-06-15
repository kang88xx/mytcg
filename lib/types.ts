// 마이TCG — 공유 타입/상수 (docs/PRD.md, DESIGN_GUIDE.md 기준)

export const SCORING_VERSION = "heuristic-v1";

// 등급 체계 (낮음 → 높음, 공식 Scarlet&Violet 순서):
// D C B A / R(Double Rare) SR(Ultra Rare) AR(Illustration Rare)
// ASR(Special Illustration Rare) SSR(Hyper Rare)
export type Grade = "D" | "C" | "B" | "A" | "R" | "SR" | "AR" | "ASR" | "SSR";
export const GRADES_ASC: Grade[] = ["D", "C", "B", "A", "R", "SR", "AR", "ASR", "SSR"];
export function gradeRank(g: Grade): number {
  return GRADES_ASC.indexOf(g);
}
// R 이상 = 반짝임(홀로/스파클), SR(Ultra Rare) 이상 = 풀아트 레이아웃
export function isShiny(g: Grade): boolean {
  return gradeRank(g) >= gradeRank("R");
}
export function isFullArt(g: Grade): boolean {
  return gradeRank(g) >= gradeRank("SR");
}

// 공식 Scarlet & Violet 등급 용어에 정렬 (codex 리서치 + Pokemon.com 교차검증)
export type Rarity =
  | "Hyper Rare"
  | "Ultra Rare"
  | "Special Illustration Rare"
  | "Illustration Rare"
  | "Double Rare"
  | "Rare"
  | "Uncommon"
  | "Common"
  | "Base";

// 공식 레어도 심볼 (등급별). kind = 도형(SVG로 렌더 — 폰트 글리프 비의존)
export type MarkKind = "circle" | "diamond" | "star";
export const RARITY_MARK: Record<Grade, { kind: MarkKind; count: number; color: string }> = {
  D: { kind: "circle", count: 1, color: "#7B85A3" }, // 기본
  C: { kind: "circle", count: 1, color: "#10101a" }, // Common ●
  B: { kind: "diamond", count: 1, color: "#10101a" }, // Uncommon ◆
  A: { kind: "star", count: 1, color: "#10101a" }, // Rare ★
  R: { kind: "star", count: 2, color: "#10101a" }, // Double Rare — 2 black stars
  AR: { kind: "star", count: 1, color: "#F5C400" }, // Illustration Rare — 1 gold star
  ASR: { kind: "star", count: 2, color: "#F5C400" }, // Special Illustration Rare — 2 gold stars
  SR: { kind: "star", count: 2, color: "#C8CEDB" }, // Ultra Rare — 2 silver stars
  SSR: { kind: "star", count: 3, color: "#FFCE3A" }, // Hyper Rare — 3 gold stars
};

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
// 공식 순서: R < SR < AR < ASR < SSR (점수 높을수록 상위)
export const GRADE_TABLE: { min: number; grade: Grade; rarity: Rarity }[] = [
  { min: 99, grade: "SSR", rarity: "Hyper Rare" },
  { min: 97, grade: "ASR", rarity: "Special Illustration Rare" },
  { min: 93, grade: "AR", rarity: "Illustration Rare" },
  { min: 88, grade: "SR", rarity: "Ultra Rare" },
  { min: 80, grade: "R", rarity: "Double Rare" },
  { min: 68, grade: "A", rarity: "Rare" },
  { min: 55, grade: "B", rarity: "Uncommon" },
  { min: 40, grade: "C", rarity: "Common" },
  { min: 0, grade: "D", rarity: "Base" },
];

// 등급별 디자인 톤. accent = 카드/배지 강조색. R+는 홀로 처리.
export const GRADE_TONE: Record<Grade, { label: string; accent: string }> = {
  D: { label: "Base", accent: "#56607F" },
  C: { label: "Common", accent: "#A6AEC6" },
  B: { label: "Uncommon", accent: "#25E2AE" },
  A: { label: "Rare", accent: "#2DB4F2" },
  R: { label: "Double Rare", accent: "#7AD7FF" },
  AR: { label: "Illustration Rare", accent: "#F5C400" },
  ASR: { label: "Special Illustration Rare", accent: "#FFD42E" },
  SR: { label: "Ultra Rare", accent: "#C8CEDB" },
  SSR: { label: "Hyper Rare", accent: "#FFCE3A" },
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
