import { prisma } from "@/lib/prisma";
import { getSettings, SETTING_KEYS } from "@/lib/settings";
import type { ClassInfo } from "@/types";

// ============================================
// classInfo — SINGLE SOURCE OF TRUTH (Maintenance V0.1)
// ============================================
// Identitas kelas dibaca dari tabel Setting (dapat diedit Developer/Wali
// Kelas via dashboard Settings). Fallback: konstanta di bawah, dipakai saat
// DB kosong/gagal — JUGA sebagai seed default di dashboard Settings.
//
// Aturan data:
//   - Data faktual (nama kelas, jurusan, wali kelas, tahun ajaran, sekolah,
//     angkatan, jumlah anggota) → dinamis, mengikuti Settings/database.
//   - Jumlah anggota ditampilkan = kuota konfigurasi (Setting
//     member_quota_max, default 36) — konsisten dengan kuota akun murid.
//   - Semua halaman runtime memakai getClassInfo(); snapshot classInfo
//     statis hanya untuk metadata builder, Footer, dan client components
//     (dirakit ulang setiap request karena halaman public force-dynamic).
// ============================================

export const CLASS_CONSTANTS: ClassInfo = {
  name: "X TKJ BK",
  jurusan: "Teknik Komputer dan Jaringan",
  waliKelas: "Moh. Fadhil",
  tahunAjaran: "2025/2026",
  totalAnggota: 36,
  sekolah: "SMK Bala Keselamatan Palu",
  angkatan: "2025",
};

// Snapshot statis — fallback & nilai awal (sinkron dgn seed Settings).
export const classInfo: ClassInfo = { ...CLASS_CONSTANTS };

// Konten deskriptif (editorial) — dapat diedit Developer/Wali Kelas via
// dashboard; nilai default di sini menjadi seed & fallback.
export const EDITABLE_DEFAULTS = {
  classDescription: `Kelas ${CLASS_CONSTANTS.name} merupakan bagian dari program keahlian ${CLASS_CONSTANTS.jurusan}. Program ini mempersiapkan siswa untuk memahami dan menguasai berbagai aspek teknis di bidang komputer dan infrastruktur jaringan. Selama masa pembelajaran, siswa mendapatkan pengalaman praktis melalui kegiatan laboratorium — mulai dari instalasi sistem operasi, konfigurasi jaringan, hingga pemeliharaan perangkat keras dan perangkat lunak.`,
  websiteDescription: `Website ini dibangun sebagai portal informasi resmi kelas ${CLASS_CONSTANTS.name}. Tujuan utamanya adalah menyediakan satu tempat terpusat untuk melihat informasi tentang kelas, anggota, dokumentasi kegiatan, dan struktur organisasi. Website dapat diakses publik tanpa perlu membuat akun; pengelolaan konten tersedia melalui dashboard untuk Developer dan Wali Kelas.`,
  contactNote:
    "Informasi kontak lengkap akan ditambahkan setelah koordinasi dengan pihak sekolah.",
};

// Key Setting untuk konten editable (dipakai seed di lib/settings.ts).
export const CONTENT_SETTING_KEYS = {
  CLASS_DESCRIPTION: "content_class_description",
  WEBSITE_DESCRIPTION: "content_website_description",
  CONTACT_NOTE: "content_contact_note",
} as const;

export interface EditableContent {
  classDescription: string;
  websiteDescription: string;
  contactNote: string;
}

/** Identitas kelas: Setting DB (jika ada) → fallback konstanta. */
export async function getClassInfo(): Promise<ClassInfo> {
  try {
    const settings = await getSettings();
    const read = (key: string, fallback: string) => {
      const v = settings[key]?.trim();
      return v ? v : fallback;
    };
    const quota = Number.parseInt(
      settings[SETTING_KEYS.MEMBER_QUOTA_MAX] ?? "",
      10
    );
    return {
      name: read("class_name", CLASS_CONSTANTS.name),
      jurusan: read("class_jurusan", CLASS_CONSTANTS.jurusan),
      waliKelas: read("class_wali_kelas", CLASS_CONSTANTS.waliKelas),
      tahunAjaran: read("class_tahun_ajaran", CLASS_CONSTANTS.tahunAjaran),
      // Jumlah anggota yang ditampilkan = kuota konfigurasi (SSOT pengaturan)
      totalAnggota:
        Number.isFinite(quota) && quota > 0
          ? quota
          : CLASS_CONSTANTS.totalAnggota,
      sekolah: read("class_sekolah", CLASS_CONSTANTS.sekolah),
      angkatan: read("class_angkatan", CLASS_CONSTANTS.angkatan),
    };
  } catch {
    // DB gagal — fallback konstanta (halaman tetap tampil, tidak blank)
    return { ...CLASS_CONSTANTS };
  }
}

/** Konten editorial: Setting DB (jika sudah diisi) → fallback default. */
export async function getEditableContent(): Promise<EditableContent> {
  try {
    const settings = await getSettings();
    const read = (key: string, fallback: string) => {
      const v = settings[key]?.trim();
      return v ? v : fallback;
    };
    return {
      classDescription: read(
        CONTENT_SETTING_KEYS.CLASS_DESCRIPTION,
        EDITABLE_DEFAULTS.classDescription
      ),
      websiteDescription: read(
        CONTENT_SETTING_KEYS.WEBSITE_DESCRIPTION,
        EDITABLE_DEFAULTS.websiteDescription
      ),
      contactNote: read(
        CONTENT_SETTING_KEYS.CONTACT_NOTE,
        EDITABLE_DEFAULTS.contactNote
      ),
    };
  } catch {
    return { ...EDITABLE_DEFAULTS };
  }
}

// Count anggota nyata di DB (untuk statistik/verifikasi konsistensi).
export async function getMemberCount(): Promise<number> {
  try {
    return await prisma.classMember.count();
  } catch {
    return 0;
  }
}
