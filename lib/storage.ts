import { promises as fs } from "fs";
import path from "path";

// 스토리지 추상화 — 개발: 로컬 FS(./data/uploads). 프로덕션: S3로 교체.
const ROOT = path.join(process.cwd(), "data", "uploads");

export async function saveOriginal(buf: Buffer, ext: string): Promise<string> {
  await fs.mkdir(ROOT, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext.replace(/[^a-z0-9]/gi, "") || "jpg"}`;
  const full = path.join(ROOT, name);
  await fs.writeFile(full, buf);
  return name; // Card.originalImagePath 에 저장
}

export async function readOriginal(name: string): Promise<Buffer> {
  return fs.readFile(path.join(ROOT, path.basename(name)));
}

// 카드 렌더에 사진을 임베드하기 위한 data URI
export async function originalDataUri(name: string): Promise<string> {
  const buf = await readOriginal(name);
  const ext = name.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}
