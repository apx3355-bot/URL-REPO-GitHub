"use client";

// ================================
// Helper upload galeri (client-side)
// MAINTENANCE V0.2.1 — perhalus pesan error upload galeri:
//   1. Pre-check format & ukuran SEBELUM kirim → pengguna langsung tahu
//      penyebabnya tanpa round-trip server.
//   2. Pemetaan error server (JSON API atau HTTP error body non-JSON seperti
//      413 dari Vercel) menjadi pesan spesifik: format / ukuran / koneksi.
// Server tetap memvalidasi ulang (magic bytes + limit) — helper ini hanya
// UX; keamanan tidak bergantung pada sisi client.
// ================================

export const GALLERY_MAX_MB = 5;
export const GALLERY_MAX_BYTES = GALLERY_MAX_MB * 1024 * 1024;

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

function isAllowedType(type: string): boolean {
  return (ALLOWED_MIMES as readonly string[]).includes(type);
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** Pre-check file sebelum kirim — pesan spesifik per penyebab. */
export function validateGalleryFile(file: File): string | null {
  // File kosong
  if (file.size === 0) {
    return "File kosong (0 byte). Pilih foto lain yang utuh.";
  }
  // Ukuran
  if (file.size > GALLERY_MAX_BYTES) {
    return `Ukuran file ${formatMB(file.size)} MB melebihi batas ${GALLERY_MAX_MB} MB. Kompres atau pilih foto lain.`;
  }
  // Format berdasarkan MIME yang dilaporkan browser
  if (!isAllowedType(file.type)) {
    return `Format "${file.type || "tidak dikenal"}" tidak didukung. Gunakan JPG, PNG, atau WEBP.`;
  }
  return null;
}

/**
 * Pemetaan respons error menjadi pesan spesifik.
 * Menangani: JSON API (error/fields), dan body non-JSON (mis. HTML 413
 * "FUNCTION_PAYLOAD_TOO_LARGE" dari Vercel) yang sebelumnya jatuh ke
 * "Upload gagal." generik.
 */
export async function resolveUploadError(
  res: Response,
  fallback: string
): Promise<string> {
  // 1. Coba parse JSON (API app mengirim { error, fields? })
  const data = await res
    .json()
    .catch(() => null as unknown as Record<string, unknown> | null);
  if (data && typeof data === "object") {
    const fields = data.fields as Record<string, string> | undefined;
    const specific =
      fields?.file ||
      fields?.title ||
      fields?.description ||
      (typeof data.error === "string" ? data.error : undefined);
    if (specific) return specific;
  }

  // 2. Body non-JSON — artinya error dari platform (bukan API app)
  if (res.status === 413) {
    return `Foto terlalu besar untuk dikirim (melebihi ${GALLERY_MAX_MB} MB). Kompres dulu, misalnya lewat kamera HP sebelum mengunggah.`;
  }
  if (res.status === 401) {
    return "Sesi berakhir. Muat ulang halaman, lalu login kembali.";
  }
  if (res.status === 403) {
    return "Akun Anda tidak memiliki izin mengunggah foto galeri.";
  }
  if (res.status >= 500) {
    return "Server sedang bermasalah. Coba lagi beberapa saat.";
  }
  return fallback;
}

/** Deteksi kegagalan jaringan (fetch throw) → pesan koneksi. */
export function networkErrorMessage(err: unknown): string {
  if (err instanceof TypeError) {
    return "Koneksi terputus saat mengirim. Periksa sinyal, lalu coba lagi.";
  }
  return "Terjadi kesalahan tak terduga. Coba lagi.";
}
