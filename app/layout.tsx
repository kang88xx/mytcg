import type { Metadata } from "next";
import "./globals.css";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? "마이TCG";

export const metadata: Metadata = {
  title: `${BRAND} · AI 트레이딩 카드`,
  description:
    "내 사진이 AI 카드가 됩니다. AI가 이미지 퀄리티를 분석해 점수·등급·능력치를 자동 생성하고, 리더보드에서 경쟁하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
