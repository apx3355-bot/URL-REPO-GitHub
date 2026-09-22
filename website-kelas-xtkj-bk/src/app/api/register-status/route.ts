import { NextResponse } from "next/server";
import { getQuotaStatus, getSetting, SETTING_KEYS } from "@/lib/settings";
import { handleApiError } from "@/lib/api";

// GET /api/register-status — publik. Hanya status agregat (buka/tutup, sisa kuota).
// Tidak mengekspos data user atau secret.
export async function GET() {
  try {
    const [registrationOpen, quota] = await Promise.all([
      getSetting(SETTING_KEYS.REGISTRATION_OPEN),
      getQuotaStatus(),
    ]);

    return NextResponse.json({
      registrationOpen: registrationOpen === "true",
      quota: {
        max: quota.max,
        registered: quota.registered,
        remaining: quota.remaining,
        full: quota.full,
      },
    });
  } catch (error) {
    return handleApiError(error, "register-status");
  }
}
