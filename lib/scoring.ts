import sharp from "sharp";
import type { AnalysisResult } from "./types";

// 교체 가능한 채점 인터페이스 (docs/TECH_SPEC §3.1)
// MVP: HeuristicScorer (sharp 통계). 후속: MLScorer 드롭인 교체.
export interface ImageScorer {
  analyze(buf: Buffer): Promise<AnalysisResult>;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

// 라플라시안 분산 기반 선명도
async function sharpnessOf(buf: Buffer): Promise<number> {
  const edges = await sharp(buf)
    .greyscale()
    .resize(512, 512, { fit: "inside" })
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .stats();
  const stdev = edges.channels[0]?.stdev ?? 0;
  // 경험적 매핑: stdev 0~25 → 0~100
  return clamp((stdev / 25) * 100);
}

export class HeuristicScorer implements ImageScorer {
  async analyze(buf: Buffer): Promise<AnalysisResult> {
    const img = sharp(buf);
    const meta = await img.metadata();
    const stats = await sharp(buf).stats();
    const penaltyReasons: string[] = [];

    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const minDim = Math.min(width, height);

    // --- 선명도 ---
    const sharpness = await sharpnessOf(buf);
    if (sharpness < 25) penaltyReasons.push("blurry");

    // --- 노출/밝기 --- (그레이스케일 평균 0~255, 이상치 ~120)
    const lumaMean =
      stats.channels.length >= 3
        ? 0.299 * stats.channels[0].mean +
          0.587 * stats.channels[1].mean +
          0.114 * stats.channels[2].mean
        : stats.channels[0].mean;
    // 120에서 멀어질수록 감점
    const brightness = clamp(100 - (Math.abs(lumaMean - 120) / 120) * 120);
    if (lumaMean < 45) penaltyReasons.push("too_dark");
    if (lumaMean > 225) penaltyReasons.push("too_bright");

    // --- 해상도 --- (최소변 400 미만 저해상)
    const resolution = clamp((minDim / 1200) * 100);
    if (minDim < 400) penaltyReasons.push("low_resolution");

    // --- 구도 --- (이미지 엔트로피: 정보량)
    const entropy = stats.entropy ?? 0; // 0~8
    const composition = clamp((entropy / 7.5) * 100);

    // --- 피사체 인식도 --- (채널 표준편차 평균: 대비/구조)
    const avgStdev =
      stats.channels.reduce((a, c) => a + c.stdev, 0) / stats.channels.length;
    const subject = clamp((avgStdev / 70) * 100);
    if (subject < 12) penaltyReasons.push("no_subject");

    // --- 색감/카드화 적합도 --- (채도 근사)
    const dom = stats.dominant ?? { r: 128, g: 128, b: 128 };
    const maxc = Math.max(dom.r, dom.g, dom.b);
    const minc = Math.min(dom.r, dom.g, dom.b);
    const saturation = maxc === 0 ? 0 : (maxc - minc) / maxc; // 0~1
    const color = clamp(40 + saturation * 90);

    // --- 가중 합산 (docs/PRD §7) ---
    const finalScore = clamp(
      sharpness * 0.25 +
        brightness * 0.15 +
        resolution * 0.15 +
        composition * 0.2 +
        subject * 0.15 +
        color * 0.1
    );

    const dominantColors = [rgbToHex(dom.r, dom.g, dom.b)];

    return {
      sharpness,
      brightness,
      resolution,
      composition,
      subject,
      color,
      finalScore,
      detectedSubjectType: null, // MVP: 미구현 (ML 단계에서)
      dominantColors,
      penaltyReasons,
    };
  }
}

export function applyPenalties(
  finalScore: number,
  reasons: string[]
): number {
  let score = finalScore;
  const map: Record<string, number> = {
    low_resolution: -20,
    too_dark: -10,
    no_subject: -15,
    duplicate: -30,
    watermark_suspect: -10,
  };
  for (const r of reasons) score += map[r] ?? 0;
  return Math.max(0, Math.min(100, score));
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// 기본 스코어러 (교체 지점)
export const scorer: ImageScorer = new HeuristicScorer();
