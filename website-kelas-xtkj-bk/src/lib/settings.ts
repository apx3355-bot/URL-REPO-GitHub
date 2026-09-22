import { prisma } from "@/lib/prisma";

// ================================
// Settings (Phase 6) — konfigurasi non-secret yang aman dikelola via dashboard.
// TIDAK untuk secret/API key — itu tetap di environment variables.
// ================================

export const SETTING_KEYS = {
  MEMBER_QUOTA_MAX: "member_quota_max",
  REGISTRATION_OPEN: "registration_open",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.MEMBER_QUOTA_MAX]: "36",
  [SETTING_KEYS.REGISTRATION_OPEN]: "true",
};

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function setSetting(
  key: SettingKey,
  value: string,
  updatedBy: number | null
): Promise<void> {
  const existing = await prisma.setting.findUnique({ where: { key } });
  if (existing) {
    await prisma.setting.update({
      where: { key },
      data: { value, updatedBy },
    });
  } else {
    await prisma.setting.create({
      data: { key, value, updatedBy },
    });
  }
}

/** Status kuota anggota: max, terdaftar (murid aktif), sisa, penuh. */
export async function getQuotaStatus() {
  const [maxStr, registered] = await Promise.all([
    getSetting(SETTING_KEYS.MEMBER_QUOTA_MAX),
    // Terdaftar = akun murid aktif (akun developer/wali tidak dihitung kuota)
    prisma.user.count({ where: { role: "ANGGOTA", isActive: true } }),
  ]);
  const parsed = Number.parseInt(maxStr, 10);
  const max = Number.isFinite(parsed) && parsed > 0 ? parsed : 36;
  return {
    max,
    registered,
    remaining: Math.max(0, max - registered),
    full: registered >= max,
  };
}
