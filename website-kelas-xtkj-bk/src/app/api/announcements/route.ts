import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  requirePermission,
  parseBody,
  handleApiError,
  logActivity,
} from "@/lib/api";
import { notifyUsers } from "@/lib/notify";

// GET /api/announcements?status=PUBLISHED&q=<search>
// Publik: hanya PUBLISHED. Developer/Wali Kelas: bisa lihat semua via ?all=1
// Urutan: pinned dulu, lalu terbaru.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wantAll = searchParams.get("all") === "1";
    const q = searchParams.get("q")?.trim() || "";
    const user = await getSessionUser();

    const canSeeAll =
      user &&
      ((user.role === "DEVELOPER") ||
        (user.role === "WALI_KELAS" && wantAll));

    const announcements = await prisma.announcement.findMany({
      where: {
        ...(canSeeAll ? {} : { status: "PUBLISHED" }),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { content: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        author: { select: { username: true, profile: { select: { fullName: true } } } },
      },
      take: 100,
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    return handleApiError(error, "announcements:list");
  }
}

const createSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(120),
  content: z.string().trim().min(10, "Isi minimal 10 karakter").max(5000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
});

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("announcements", "create");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, createSchema);
    if (!body.ok) return body.response;

    const announcement = await prisma.announcement.create({
      data: {
        title: body.data.title,
        content: body.data.content,
        status: body.data.status,
        authorId: guard.user.id,
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "ANNOUNCEMENT_CREATE",
      description: `${guard.user.username} membuat pengumuman "${announcement.title}"`,
      targetType: "announcement",
      targetId: announcement.id,
    });

    // Notifikasi pengumuman baru hanya jika langsung PUBLISHED (anti spam: draft tidak)
    let notified = 0;
    if (announcement.status === "PUBLISHED") {
      notified = await notifyUsers({
        excludeUserId: guard.user.id,
        type: "ANNOUNCEMENT",
        message: `Pengumuman baru: ${announcement.title}`,
        link: "/dashboard/announcements",
        targetType: "announcement",
        targetId: announcement.id,
      });
    }

    return NextResponse.json({ announcement, notified }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "announcements:create");
  }
}
