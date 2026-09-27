import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, parseBody, handleApiError, jsonError } from "@/lib/api";

// GET /api/notifications?unread=1 — notifikasi MILIK SENDIRI saja (self-only).
export async function GET(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const onlyUnread = searchParams.get("unread") === "1";

    const where = {
      userId: guard.user.id,
      ...(onlyUnread ? { isRead: false } : {}),
    };

    const [notifications, unreadCount, unreadByType] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId: guard.user.id, isRead: false },
      }),
      // Jumlah belum dibaca per tipe — untuk badge pada item menu drawer
      // (ANNOUNCEMENT -> Pengumuman, SUBMISSION+ASSIGNMENT -> Tugas, dst.)
      prisma.notification.groupBy({
        by: ["type"],
        where: { userId: guard.user.id, isRead: false },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount, unreadByType });
  } catch (error) {
    return handleApiError(error, "notifications:list");
  }
}

// PATCH — tandai dibaca: { id } satu notifikasi, atau { all: true } semuanya.
const markSchema = z.object({
  id: z.number().int().positive().optional(),
  all: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, markSchema);
    if (!body.ok) return body.response;

    if (body.data.all) {
      const res = await prisma.notification.updateMany({
        where: { userId: guard.user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ updated: res.count });
    }

    if (body.data.id) {
      // Self-only: where mencakup userId → ID user lain tidak tersentuh
      const res = await prisma.notification.updateMany({
        where: { id: body.data.id, userId: guard.user.id },
        data: { isRead: true },
      });
      if (res.count === 0) return jsonError("Notifikasi tidak ditemukan.", 404);
      return NextResponse.json({ ok: true });
    }

    return jsonError("Payload tidak valid.", 400);
  } catch (error) {
    return handleApiError(error, "notifications:read");
  }
}
