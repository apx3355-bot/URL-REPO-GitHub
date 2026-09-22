import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, parseBody, handleApiError, logActivity } from "@/lib/api";
import { getSettings, setSetting, SETTING_KEYS } from "@/lib/settings";

// GET /api/settings — developer only. Hanya konfigurasi non-secret.
export async function GET() {
  try {
    const guard = await requirePermission("settings", "read");
    if (!guard.ok) return guard.response;

    const settings = await getSettings();
    return NextResponse.json({
      settings: {
        memberQuotaMax: Number.parseInt(settings[SETTING_KEYS.MEMBER_QUOTA_MAX], 10) || 36,
        registrationOpen: settings[SETTING_KEYS.REGISTRATION_OPEN] === "true",
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
});

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

    return NextResponse.json({
      ok: true,
      changed: changes,
      message: changes.length ? `Pengaturan disimpan (${changes.join(", ")}).` : "Tidak ada perubahan.",
    });
  } catch (error) {
    return handleApiError(error, "settings:update");
  }
}
