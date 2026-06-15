"use client";

import { useState } from "react";
import type { SharePlatform } from "@/lib/types";

export default function ShareButtons({
  cardId,
  shareUrl,
  imageUrl,
}: {
  cardId: string;
  shareUrl: string;
  imageUrl: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  async function log(platform: SharePlatform, action: "click" | "success" | "fail" = "click") {
    try {
      await fetch("/api/share-logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId, platform, action }),
      });
    } catch {}
  }

  async function copyLink() {
    await log("link");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMsg("링크가 복사되었습니다!");
    } catch {
      setMsg(shareUrl);
    }
    setTimeout(() => setMsg(null), 2500);
  }

  async function download() {
    await log("download");
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `mytcg-${cardId.slice(0, 8)}.png`;
    a.click();
  }

  async function shareNative(platform: SharePlatform) {
    await log(platform);
    if (navigator.share) {
      try {
        await navigator.share({ title: "내 AI 카드", url: shareUrl });
        await log(platform, "success");
        return;
      } catch {}
    }
    // 폴백: 새 탭으로 공유 인텐트
    const u = encodeURIComponent(shareUrl);
    const map: Partial<Record<SharePlatform, string>> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      kakao: shareUrl, // 카카오 SDK 미설정 시 링크 복사 폴백
      instagram_story: shareUrl,
      instagram_feed: shareUrl,
    };
    const target = map[platform];
    if (platform === "facebook" && target) window.open(target, "_blank");
    else copyLink();
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn fb block" onClick={() => shareNative("facebook")}>
          페이스북
        </button>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn insta block" onClick={() => shareNative("instagram_story")}>
          인스타 스토리
        </button>
        <button className="btn insta block" onClick={() => shareNative("instagram_feed")}>
          인스타 피드
        </button>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost block" onClick={download}>
          ⬇ 이미지 저장
        </button>
        <button className="btn ghost block" onClick={copyLink}>
          🔗 링크 복사
        </button>
      </div>
      {msg && <div className="notice" style={{ color: "var(--accent)" }}>{msg}</div>}
    </div>
  );
}
