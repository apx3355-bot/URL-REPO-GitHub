import crypto from "crypto";
import {
  uploadGalleryImage,
  isStorageImagePath,
} from "@/lib/storage";
import fs from "fs/promises";
import path from "path";

// ================================
// File upload security — Phase 5
// - Validasi magic bytes (bukan cuma extension)
// - Filename disanitasi + diganti nama acak
// - Batas ukuran
// ================================

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "gallery");

const ALLOWED_TYPES: Record<string, { ext: string }> = {
  "image/jpeg": { ext: "jpg" },
  "image/png": { ext: "png" },
  "image/webp": { ext: "webp" },
};

export function isAllowedMime(mime: string): boolean {
  return mime in ALLOWED_TYPES;
}

/** Deteksi tipe file nyata dari magic bytes. */
export function detectImageType(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
    bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
    bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 &&
    bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Nama file aman: ekstensi dari MIME nyata, nama acak. */
export function generateSafeFilename(mime: string): string {
  const ext = ALLOWED_TYPES[mime]?.ext ?? "bin";
  const random = crypto.randomBytes(12).toString("hex");
  return `${Date.now()}-${random}.${ext}`;
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Simpan gambar galeri — return path yang SIAP disimpan di imagePath.
 * Urutan prioritas:
 * 1. Supabase Storage (jika SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY diset)
 *    → URL publik `.../storage/v1/object/public/gallery/<nama>` — durabel.
 * 2. Filesystem lokal (dev/VM writable) → `/uploads/gallery/<nama>`
 *    (pola lama Phase 5; ephemeral di Vercel).
 * 3. Data URL di DB (serverless tanpa Storage) → diserve via
 *    `/api/gallery/image/<id>` (pola Phase 12) — fallback terakhir.
 */
export async function saveUploadFile(
  buffer: Buffer,
  mime: string
): Promise<{ filename: string; publicPath: string }> {
  const filename = generateSafeFilename(mime);

  // 1. Supabase Storage — penyimpanan durabel produksi
  const stored = await uploadGalleryImage(buffer, mime);
  if (stored) {
    return { filename, publicPath: stored.publicUrl };
  }

  // 2. Filesystem lokal
  try {
    await ensureUploadDir();
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return { filename, publicPath: `/uploads/gallery/${filename}` };
  } catch {
    // 3. Filesystem read-only (serverless) → data URL di DB
    return { filename, publicPath: `data:${mime};base64,${buffer.toString("base64")}` };
  }
}

export async function deleteUploadFile(publicPath: string): Promise<void> {
  // Storage Supabase → hapus object di sana
  if (isStorageImagePath(publicPath)) {
    const { deleteGalleryImage } = await import("@/lib/storage");
    await deleteGalleryImage(publicPath);
    return;
  }
  // Data URL (fallback serverless) → tidak ada file fisik
  if (publicPath.startsWith("data:")) return;
  // Hanya hapus file di dalam direktori upload — cegah path traversal
  const resolved = path.resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) return;
  try {
    await fs.unlink(resolved);
  } catch {
    // file sudah tidak ada — abaikan
  }
}
