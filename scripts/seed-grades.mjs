// 등급별 렌더 검증용 시드 (임시) — 저장된 사진을 재사용해 9등급 카드 생성
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const GRADES = [
  ["D", 20], ["C", 48], ["B", 62], ["A", 73], ["R", 83],
  ["AR", 89], ["ASR", 93], ["SR", 97], ["SSR", 99.6],
];
const RAR = { D: "Base", C: "Common", B: "Uncommon", A: "Rare", R: "Double Rare", AR: "Art Rare", ASR: "Special Art Rare", SR: "Super Rare", SSR: "Secret Rare" };
const ELEMS = ["Aqua", "Flame", "Storm", "Neon", "Spirit", "Shadow", "Solar", "Lunar", "Metal"];

const base = await prisma.card.findFirst({
  where: { status: "active", grade: { not: null } },
  orderBy: { createdAt: "desc" },
});
if (!base) { console.error("기준 카드 없음 — 먼저 카드 1장 업로드 필요"); process.exit(1); }

for (let i = 0; i < GRADES.length; i++) {
  const [g, score] = GRADES[i];
  const c = await prisma.card.create({
    data: {
      userId: base.userId,
      originalImagePath: base.originalImagePath,
      score, grade: g, rarity: RAR[g], element: ELEMS[i % ELEMS.length],
      pwr: Math.round(60 + score * 2), skillName: "라이트닝 연속탄", skillPower: 120,
      passiveName: "볼트 플로트", frame: "Neon",
      status: "active", isPublic: true, isLeaderboardEligible: false,
    },
  });
  console.log(`${g}\t${c.id}`);
}
await prisma.$disconnect();
