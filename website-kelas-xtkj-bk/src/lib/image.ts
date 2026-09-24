// Validasi gambar di server — MAGIC BYTES, bukan percaya extension/MIME client.
// Dipakai: avatar profile (PUT /api/profile).

export const AVATAR_MAX_BYTES = 200_000; // ~200 KB base64-encoded

interface ImageMeta {
  mime: string;
  ext: string;
}

/** Cek magic bytes (file signature) untuk tipe yang diizinkan. */
function sniffImage(bytes: Uint8Array): ImageMeta | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export type ImageValidation =
  | { ok: true; meta: ImageMeta }
  | { ok: false; message: string };

/**
 * Validasi data URL gambar: format diizinkan (jpg/png/webp), ukuran maksimum,
 * dan signature file sesuai. Mengembalikan error berbahasa Indonesia untuk UI.
 */
export function validateImageFile(dataUrl: string): ImageValidation {
  const match = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return { ok: false, message: "Format foto tidak dikenal." };
  }
  const [, claimedMime, base64] = match;

  // Decode & sniff — claimedMime TIDAK dipercai
  let bytes: Uint8Array;
  try {
    const bin = Buffer.from(base64, "base64");
    bytes = new Uint8Array(bin);
  } catch {
    return { ok: false, message: "Data foto rusak." };
  }
  if (bytes.length < 12) {
    return { ok: false, message: "File terlalu kecil untuk menjadi gambar." };
  }

  const meta = sniffImage(bytes);
  if (!meta) {
    return {
      ok: false,
      message: "Tipe file tidak didukung. Gunakan JPG, PNG, atau WEBP.",
    };
  }
  if (claimedMime !== meta.mime) {
    return {
      ok: false,
      message: "Isi file tidak sesuai format yang diklaim.",
    };
  }
  if (base64.length > AVATAR_MAX_BYTES) {
    return {
      ok: false,
      message: "Foto maksimal 200 KB. Kecilkan foto lalu coba lagi.",
    };
  }
  return { ok: true, meta };
}
