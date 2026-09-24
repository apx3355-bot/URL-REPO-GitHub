import { prisma } from "@/lib/prisma";

// ================================
// Notifikasi in-app (Phase 11) — fan-out sederhana, anti spam:
// - Role penerima dibatasi (mis. pengumuman hanya ke ANGGOTA)
// - Maks 50 penerima per aksi (kelas 36 murid — cukup, melindungi dari fan-out liar)
// - self-notify dilewati (pembuat tidak diberi tahu tentang aksinya sendiri)
// - deduplikasi antar penerima ditangani penelepon; helper ini murni createMany best-effort.
// ================================

const MAX_RECIPIENTS = 50;

export interface NotifyInput {
  /** Role penerima; kosong = semua role */
  roles?: string[];
  /** UserID yang TIDAK diberi notifikasi (biasanya pembuat aksi) */
  excludeUserId?: number;
  type: string;
  message: string;
  link?: string;
  targetType?: string;
  targetId?: number;
}

export async function notifyUsers(input: NotifyInput): Promise<number> {
  try {
    const recipients = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(input.roles?.length ? { role: { in: input.roles } } : {}),
        ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
      },
      select: { id: true },
      take: MAX_RECIPIENTS,
    });
    if (recipients.length === 0) return 0;

    const res = await prisma.notification.createMany({
      data: recipients.map((u) => ({
        userId: u.id,
        type: input.type,
        message: input.message.slice(0, 200),
        link: input.link ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
      })),
    });
    return res.count;
  } catch (error) {
    // Notifikasi best-effort — jangan menggagalkan aksi utama
    console.error("[notify] gagal membuat notifikasi:", error);
    return 0;
  }
}

/** Notifikasi ke satu user (mis. pemilik posting dibalas, upload dimoderasi). */
export async function notifyUser(params: {
  userId: number;
  type: string;
  message: string;
  link?: string;
  targetType?: string;
  targetId?: number;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        message: params.message.slice(0, 200),
        link: params.link ?? null,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
      },
    });
  } catch (error) {
    console.error("[notify] gagal membuat notifikasi:", error);
  }
}
