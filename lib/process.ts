import { prisma } from "./db";
import { readOriginal } from "./storage";
import { scorer, applyPenalties } from "./scoring";
import { generateCard } from "./cardgen";
import { imageHash, perceptualHash, hammingDistance } from "./hash";
import { SCORING_VERSION } from "./types";

const PHASH_SIMILAR_THRESHOLD = 6; // 해밍거리 ≤ 6 → 유사

// 업로드된 카드 1건을 채점/생성/등록 (서버 권위)
export async function processCard(cardId: string): Promise<void> {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return;

  try {
    const buf = await readOriginal(card.originalImagePath);

    const iHash = imageHash(buf);
    const pHash = await perceptualHash(buf);

    // 중복/유사 검사 (다른 사용자/이전 카드)
    const penaltyReasons: string[] = [];
    const exactDup = await prisma.card.findFirst({
      where: { imageHash: iHash, id: { not: cardId }, status: { not: "deleted" } },
    });
    if (exactDup) penaltyReasons.push("duplicate");
    else {
      const recent = await prisma.card.findMany({
        where: { id: { not: cardId }, perceptualHash: { not: null }, status: { not: "deleted" } },
        select: { perceptualHash: true },
        take: 500,
        orderBy: { createdAt: "desc" },
      });
      for (const r of recent) {
        if (r.perceptualHash && hammingDistance(pHash, r.perceptualHash) <= PHASH_SIMILAR_THRESHOLD) {
          penaltyReasons.push("duplicate");
          break;
        }
      }
    }

    const analysis = await scorer.analyze(buf);
    const allPenalties = [...new Set([...analysis.penaltyReasons, ...penaltyReasons])];
    const finalScore = applyPenalties(analysis.finalScore, allPenalties);

    const generated = generateCard(analysis, finalScore, iHash);
    const isDuplicate = allPenalties.includes("duplicate");

    await prisma.imageAnalysis.create({
      data: {
        cardId,
        sharpnessScore: analysis.sharpness,
        brightnessScore: analysis.brightness,
        resolutionScore: analysis.resolution,
        compositionScore: analysis.composition,
        subjectScore: analysis.subject,
        colorScore: analysis.color,
        finalScore,
        detectedSubjectType: analysis.detectedSubjectType,
        dominantColors: JSON.stringify(analysis.dominantColors),
        penaltyReasons: JSON.stringify(allPenalties),
      },
    });

    await prisma.card.update({
      where: { id: cardId },
      data: {
        score: generated.score,
        grade: generated.grade,
        rarity: generated.rarity,
        element: generated.element,
        pwr: generated.pwr,
        skillName: generated.skillName,
        skillPower: generated.skillPower,
        passiveName: generated.passiveName,
        frame: generated.frame,
        analysisJson: JSON.stringify(analysis),
        imageHash: iHash,
        perceptualHash: pHash,
        scoringVersion: SCORING_VERSION,
        status: "active",
        // 중복은 랭킹 제외 (점수는 표시하되 리더보드 미반영)
        isLeaderboardEligible: !isDuplicate,
      },
    });
  } catch (e) {
    console.error("processCard failed", cardId, e);
    await prisma.card.update({
      where: { id: cardId },
      data: { status: "blocked" },
    });
  }
}
