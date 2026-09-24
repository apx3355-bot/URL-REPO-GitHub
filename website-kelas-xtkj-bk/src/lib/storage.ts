import crypto from "crypto";

// ================================
// Supabase Storage — foto galeri (post-release upgrade)
// - REST API murni (fetch) — tanpa dependency SDK baru.
// - Service key HANYA dibaca dari env di server; tidak pernah ke client.
// - Bucket "gallery" (public read, 5 MB, JPG/PNG/WEBP).
// - Jika env belum diset → return null → pemanggil jatuh ke fallback
//   data URL (pola Phase 12) sehingga app tetap berfungsi.
// ================================

const BUCKET = "gallery";
const MAX_BYTES = 5 * 1024 * 1024;

export function storageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function env(): { url: string; key: string } {
  return {
    url: (process.env.SUPABASE_URL ?? "").replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isStorageImagePath(imagePath: string): boolean {
  return imagePath.includes(`/storage/v1/object/public/${BUCKET}/`);
}

/** Path object di dalam bucket dari URL publik Storage. */
function objectPathFromUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/**
 * Upload gambar ke Supabase Storage. Return URL publik, atau null bila
 * storage belum dikonfigurasi / upload gagal (caller pakai fallback).
 */
export async function uploadGalleryImage(
  buffer: Buffer,
  mime: string
): Promise<{ publicUrl: string } | null> {
  if (!storageConfigured()) return null;
  const ext = EXT_BY_MIME[mime];
  if (!ext || buffer.length === 0 || buffer.length > MAX_BYTES) return null;

  const { url, key } = env();
  const random = crypto.randomBytes(10).toString("hex");
  const objectPath = `${Date.now()}-${random}.${ext}`;

  try {
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": mime,
        "x-upsert": "false",
      },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) return null;
    return { publicUrl: `${url}/storage/v1/object/public/${BUCKET}/${objectPath}` };
  } catch {
    return null;
  }
}

/** Hapus object dari Storage (best-effort; gagal diabaikan — item DB sudah terhapus). */
export async function deleteGalleryImage(imagePath: string): Promise<void> {
  if (!storageConfigured() || !isStorageImagePath(imagePath)) return;
  const objectPath = objectPathFromUrl(imagePath);
  if (!objectPath) return;
  const { url, key } = env();
  try {
    await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch {
    // best-effort
  }
}
