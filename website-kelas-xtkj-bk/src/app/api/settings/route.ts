import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, parseBody, handleApiError, logActivity, jsonError } from "@/lib/api";
import { getSettings, setSetting, SETTING_KEYS } from "@/lib/settings";

// GET /api/settings — Developer & Wali Kelas (settings.read). Hanya konfigurasi non-secret.
export async function GET() {
  try {
    const guard = await requirePermission("settings", "read");
    if (!guard.ok) return guard.response;

    const settings = await getSettings();
    const s = (key: string) => settings[key] ?? "";
    return NextResponse.json({
      settings: {
        memberQuotaMax: Number.parseInt(settings[SETTING_KEYS.MEMBER_QUOTA_MAX], 10) || 36,
        registrationOpen: settings[SETTING_KEYS.REGISTRATION_OPEN] === "true",
      },
      // Maintenance V0.1 — identitas kelas & konten editorial (kosong =
      // memakai fallback default di data/classInfo.ts)
      identity: {
        className: s(SETTING_KEYS.CLASS_NAME),
        classJurusan: s(SETTING_KEYS.CLASS_JURUSAN),
        classWaliKelas: s(SETTING_KEYS.CLASS_WALI_KELAS),
        classTahunAjaran: s(SETTING_KEYS.CLASS_TAHUN_AJARAN),
        classSekolah: s(SETTING_KEYS.CLASS_SEKOLAH),
        classAngkatan: s(SETTING_KEYS.CLASS_ANGKATAN),
      },
      content: {
        classDescription: s(SETTING_KEYS.CONTENT_CLASS_DESCRIPTION),
        websiteDescription: s(SETTING_KEYS.CONTENT_WEBSITE_DESCRIPTION),
        contactNote: s(SETTING_KEYS.CONTENT_CONTACT_NOTE),
      },
    });
  } catch (error) {
    return handleApiError(error, "settings:get");
  }
}

// PUT /api/settings — developer only.
const updateSchema = z.object({
  memberQuotaMax: z.number().int().min(1, "Kuota minimal 1").max(500, "Kuota maksimal 500").optional(),
  registrationOpen: z.boolean().optional(),
  // Maintenance V0.1 — identitas & konten (string kosong = kembali ke default)
  identity: z
    .object({
      className: z.string().trim().max(60).optional(),
      classJurusan: z.string().trim().max(120).optional(),
      classWaliKelas: z.string().trim().max(80).optional(),
      classTahunAjaran: z.string().trim().max(20).optional(),
      classSekolah: z.string().trim().max(120).optional(),
      classAngkatan: z.string().trim().max(20).optional(),
    })
    .optional(),
  content: z
    .object({
      classDescription: z.string().max(2000).optional(),
      websiteDescription: z.string().max(2000).optional(),
      contactNote: z.string().max(300).optional(),
    })
    .optional(),
});

const IDENTITY_FIELDS = [
  { key: SETTING_KEYS.CLASS_NAME, prop: "className", label: "Nama Kelas" },
  { key: SETTING_KEYS.CLASS_JURUSAN, prop: "classJurusan", label: "Jurusan" },
  { key: SETTING_KEYS.CLASS_WALI_KELAS, prop: "classWaliKelas", label: "Wali Kelas" },
  { key: SETTING_KEYS.CLASS_TAHUN_AJARAN, prop: "classTahunAjaran", label: "Tahun Ajaran" },
  { key: SETTING_KEYS.CLASS_SEKOLAH, prop: "classSekolah", label: "Sekolah" },
  { key: SETTING_KEYS.CLASS_ANGKATAN, prop: "classAngkatan", label: "Angkatan" },
] as const;

const CONTENT_FIELDS = [
  { key: SETTING_KEYS.CONTENT_CLASS_DESCRIPTION, prop: "classDescription", label: "Deskripsi kelas" },
  { key: SETTING_KEYS.CONTENT_WEBSITE_DESCRIPTION, prop: "websiteDescription", label: "Deskripsi website" },
  { key: SETTING_KEYS.CONTENT_CONTACT_NOTE, prop: "contactNote", label: "Catatan kontak" },
] as const;

export async function PUT(request: Request) {
  try {
    const guard = await requirePermission("settings", "update");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    const changes: string[] = [];

    if (body.data.memberQuotaMax !== undefined) {
      const before = await getSettings();
      const oldVal = before[SETTING_KEYS.MEMBER_QUOTA_MAX];
      await setSetting(
        SETTING_KEYS.MEMBER_QUOTA_MAX,
        String(body.data.memberQuotaMax),
        guard.user.id
      );
      if (oldVal !== String(body.data.memberQuotaMax)) {
        changes.push(`kuota anggota: ${oldVal} → ${body.data.memberQuotaMax}`);
        await logActivity({
          userId: guard.user.id,
          action: "SETTINGS_QUOTA_CHANGE",
          description: `${guard.user.username} mengubah kuota anggota: ${oldVal} → ${body.data.memberQuotaMax}`,
          targetType: "setting",
        });
      }
    }

    if (body.data.registrationOpen !== undefined) {
      // Registrasi akun = kewenangan Developer saja (Wali Kelas mengelola
      // kuota/identitas/konten, bukan pendaftaran akun publik)
      if (guard.user.role !== "DEVELOPER") {
        return jsonError(
          "Pengaturan registrasi akun hanya dapat diubah Developer.",
          403
        );
      }
      await setSetting(
        SETTING_KEYS.REGISTRATION_OPEN,
        String(body.data.registrationOpen),
        guard.user.id
      );
      changes.push(`registrasi ${body.data.registrationOpen ? "dibuka" : "ditutup"}`);
      await logActivity({
        userId: guard.user.id,
        action: "SETTINGS_REGISTRATION_CHANGE",
        description: `${guard.user.username} ${body.data.registrationOpen ? "membuka" : "menutup"} registrasi publik`,
        targetType: "setting",
      });
    }

    // Identitas kelas — perubahan tercermin di beranda/tentang/footer otomatis
    if (body.data.identity) {
      for (const f of IDENTITY_FIELDS) {
        const val = body.data.identity[f.prop];
        if (val === undefined) continue;
        await setSetting(f.key, val, guard.user.id);
        changes.push(`${f.label}`);
      }
      if (changes.length) {
        await logActivity({
          userId: guard.user.id,
          action: "SETTINGS_IDENTITY_CHANGE",
          description: `${guard.user.username} mengubah identitas kelas: ${changes.join(", ")}`,
          targetType: "setting",
        });
      }
    }

    // Konten editorial — tampil di beranda & halaman Tentang
    if (body.data.content) {
      const contentChanges: string[] = [];
      for (const f of CONTENT_FIELDS) {
        const val = body.data.content[f.prop];
        if (val === undefined) continue;
        await setSetting(f.key, val, guard.user.id);
        contentChanges.push(f.label);
      }
      if (contentChanges.length) {
        changes.push(...contentChanges);
        await logActivity({
          userId: guard.user.id,
          action: "SETTINGS_CONTENT_CHANGE",
          description: `${guard.user.username} memperbarui konten: ${contentChanges.join(", ")}`,
          targetType: "setting",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      changed: changes,
      message: changes.length ? `Pengaturan disimpan (${changes.join(", ")}).` : "Tidak ada perubahan.",
    });
  } catch (error) {
    return handleApiError(error, "settings:update");
  }
}
