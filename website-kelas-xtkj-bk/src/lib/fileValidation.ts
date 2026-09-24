// Validasi lampiran dokumen di server — MAGIC BYTES, bukan percaya extension/MIME client.
// Dipakai: materi (≤2 MB), lampiran tugas (≤2 MB), submission (≤3 MB).
// Format diizinkan: PDF, PNG, JPEG, ZIP (docx/pptx/xlsx adalah ZIP).

export const MATERIAL_FILE_MAX_BASE64 = 2_666_668; // ~2 MB biner (base64 × 4/3)
export const SUBMISSION_FILE_MAX_BASE64 = 4_000_000; // ~3 MB biner (base64 × 4/3)

interface DocMeta {
  mime: string;
  ext: string;
  /** true bila file adalah gambar (bisa dirender langsung di <img>) */
  isImage: boolean;
}

function sniffDoc(bytes: Uint8Array): DocMeta | null {
  // PDF: 25 50 44 46 ("%PDF")
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { mime: "application/pdf", ext: "pdf", isImage: false };
  }
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mime: "image/png", ext: "png", isImage: true };
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg", isImage: true };
  }
  // ZIP-based (docx/pptx/xlsx/zip): 50 4B 03 04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return { mime: "application/zip", ext: "zip", isImage: false };
  }
  return null;
}

export type FileValidation =
  | { ok: true; meta: DocMeta; sizeBytes: number }
  | { ok: false; message: string };

export function humanSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export const ALLOWED_DOC_LABEL = "PDF, PNG, JPG, ZIP, DOCX, PPTX, atau XLSX";

/**
 * Validasi data URL lampiran: format diizinkan, ukuran maksimum,
 * dan signature file sesuai. Pesan error berbahasa Indonesia untuk UI.
 */
export function validateDocFile(
  dataUrl: string,
  maxBase64: number
): FileValidation {
  const match = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return { ok: false, message: "Format file tidak dikenal." };
  }
  const [, claimedMime, base64] = match;

  if (base64.length > maxBase64) {
    const maxBin = Math.floor((maxBase64 * 3) / 4);
    return {
      ok: false,
      message: `Ukuran file maksimal ${humanSize(maxBin)}.`,
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(base64, "base64"));
  } catch {
    return { ok: false, message: "Data file rusak." };
  }
  if (bytes.length < 8) {
    return { ok: false, message: "File terlalu kecil / kosong." };
  }

  const meta = sniffDoc(bytes);
  if (!meta) {
    return {
      ok: false,
      message: `Tipe file tidak didukung. Gunakan ${ALLOWED_DOC_LABEL}.`,
    };
  }
  // ZIP terdeteksi sebagai application/zip — dokumen Office juga dibolehkan;
  // claimed MIME Office boleh cocok dengan signature ZIP.
  const zipClaimed =
    meta.ext === "zip" &&
    /^application\/(zip|x-zip-compressed|vnd\.openxmlformats-officedocument\.[\w-]+)/.test(
      claimedMime
    );
  if (claimedMime !== meta.mime && !zipClaimed) {
    return {
      ok: false,
      message: "Isi file tidak sesuai format yang diklaim.",
    };
  }

  return { ok: true, meta, sizeBytes: bytes.length };
}
