"use client";

// Util client-side untuk avatar: resize di canvas + re-encode ke JPEG data URL.
// Tujuan: file besar dikompres SEBELUM dikirim, jadi server menerima payload kecil
// yang lolos limit 200 KB. Validasi server tetap magic bytes (tidak percaya client).

export const AVATAR_INPUT_MAX_BYTES = 8 * 1024 * 1024; // batas file asli: 8 MB
export const AVATAR_DIM = 256; // sisi output canvas (px)
export const AVATAR_MIME = "image/jpeg";
export const AVATAR_QUALITY = 0.85;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type AvatarProcessResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

/** Validasi + kompres file gambar menjadi data URL siap upload. */
export async function processAvatarFile(file: File): Promise<AvatarProcessResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, message: "Gunakan foto JPG, PNG, atau WEBP." };
  }
  if (file.size > AVATAR_INPUT_MAX_BYTES) {
    return { ok: false, message: "Ukuran file terlalu besar (maksimal 8 MB)." };
  }

  // MAINTENANCE V0.2.1 — kompatibilitas Android: createImageBitmap tidak
  // tersedia/gagal di beberapa browser Android & WebView lama. Fallback:
  // decode via <img> + objectURL (jalur paling kompatibel), lalu lanjut
  // ke canvas yang sama.
  interface Drawable {
    width: number;
    height: number;
    close?: () => void;
  }
  let source: Drawable;
  let objectUrl: string | null = null;
  try {
    try {
      source = await createImageBitmap(file);
    } catch {
      objectUrl = URL.createObjectURL(file);
      source = await new Promise<Drawable>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img as unknown as Drawable);
        img.onerror = () => reject(new Error("decode"));
        img.src = objectUrl as string;
      });
    }
  } catch {
    return { ok: false, message: "File tidak dapat dibaca sebagai gambar." };
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_DIM;
    canvas.height = AVATAR_DIM;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ok: false, message: "Browser tidak mendukung pemrosesan gambar." };
    }

    // Crop tengah agar rasio 1:1 tanpa distorsi
    const side = Math.min(source.width, source.height);
    const sx = (source.width - side) / 2;
    const sy = (source.height - side) / 2;
    ctx.drawImage(source as CanvasImageSource, sx, sy, side, side, 0, 0, AVATAR_DIM, AVATAR_DIM);

    const dataUrl = canvas.toDataURL(AVATAR_MIME, AVATAR_QUALITY);
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, message: "Gagal memproses gambar. Coba file lain." };
  } finally {
    source.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
