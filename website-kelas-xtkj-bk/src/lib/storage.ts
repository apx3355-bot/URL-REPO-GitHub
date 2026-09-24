import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// ================================
// Supabase Storage — foto galeri (post-release upgrade)
// Arsitektur TANPA service key di env Vercel:
//   app (server) ──HMAC x-gallery-token──▶ Edge Function "gallery-storage"
//                                          └─ service key (auto-injected)
//                                             └─ bucket "gallery" (public read)
// - Shared secret di-bootstrap app ke tabel Setting (key storage_proxy_secret),
//   dibaca Edge Function via service role. Publik tidak bisa membaca DB.
// - Tanpa SDK baru; fetch murni. Fallback data URL tetap utuh bila proxy gagal.
// ================================

const BUCKET = "gallery";
const MAX_BYTES = 5 * 1024 * 1024;
const SECRET_KEY = "storage_proxy_secret";

const FUNCTION_URL =
  "https://fsqisbdjmqgrygmtqtbw.supabase.co/functions/v1/gallery-storage";

/** Secret shared app↔function; dibuat sekali (48 byte acak) dan disimpan di Setting. */
async function getProxySecret(): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: SECRET_KEY } });
  if (row?.value) return row.value;
  const generated = crypto.randomBytes(48).toString("base64url");
  try {
    await prisma.setting.create({ data: { key: SECRET_KEY, value: generated } });
    return generated;
  } catch {
    // Race dengan request lain — baca ulang
    const again = await prisma.setting.findUnique({ where: { key: SECRET_KEY } });
    return again?.value ?? null;
  }
}

export function storageConfigured(): boolean {
  // Proxy selalu tersedia (Edge Function + bootstrap secret otomatis)
  return true;
}

export function isStorageImagePath(imagePath: string): boolean {
  return imagePath.includes(`/storage/v1/object/public/${BUCKET}/`);
}

interface ProxyPayload {
  action: "upload" | "delete";
  ts: number;
  mime?: string;
  size?: number;
  imagePath?: string;
}

/** Panggil Edge Function dengan tanda tangan HMAC atas payload mentah. */
async function callProxy(
  payload: ProxyPayload,
  file?: Blob
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false }> {
  const secret = await getProxySecret();
  if (!secret) return { ok: false };

  const payloadStr = JSON.stringify(payload);
  const token = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");

  const headers: Record<string, string> = {
    "x-gallery-payload": payloadStr,
    "x-gallery-token": token,
  };
  let body: BodyInit;
  if (file) {
    const fd = new FormData();
    fd.append("file", file);
    body = fd;
  } else {
    headers["Content-Type"] = "application/json";
    body = payloadStr; // juga dikirim sebagai body agar kompatibel inspector
  }

  try {
    const res = await fetch(FUNCTION_URL, { method: "POST", headers, body });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as Record<string, unknown>;
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

/**
 * Upload gambar ke Supabase Storage via proxy. Return URL publik, atau null
 * bila gagal (caller jatuh ke fallback berikutnya).
 */
export async function uploadGalleryImage(
  buffer: Buffer,
  mime: string
): Promise<{ publicUrl: string } | null> {
  if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;
  const res = await callProxy(
    { action: "upload", mime, size: buffer.length, ts: Date.now() },
    new Blob([new Uint8Array(buffer)], { type: mime })
  );
  if (!res.ok) return null;
  const url = res.data.publicUrl;
  return typeof url === "string" && url.includes(`/storage/v1/object/public/${BUCKET}/`)
    ? { publicUrl: url }
    : null;
}

/** Hapus object dari Storage (best-effort). */
export async function deleteGalleryImage(imagePath: string): Promise<void> {
  if (!isStorageImagePath(imagePath)) return;
  await callProxy({ action: "delete", imagePath, ts: Date.now() });
}
