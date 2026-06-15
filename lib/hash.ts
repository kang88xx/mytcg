import { createHash } from "crypto";
import sharp from "sharp";

// 정확 중복 감지용 — 원본 바이트 SHA-256
export function imageHash(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

// 유사 이미지 감지용 — average hash (aHash) 64bit
export async function perceptualHash(buf: Buffer): Promise<string> {
  const size = 8;
  const raw = await sharp(buf)
    .greyscale()
    .resize(size, size, { fit: "fill" })
    .raw()
    .toBuffer();
  let sum = 0;
  for (let i = 0; i < raw.length; i++) sum += raw[i];
  const mean = sum / raw.length;
  let bits = "";
  for (let i = 0; i < raw.length; i++) bits += raw[i] >= mean ? "1" : "0";
  // 64bit → 16자리 hex
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

// 해밍 거리 (유사도) — 0이면 동일, 클수록 다름
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}
