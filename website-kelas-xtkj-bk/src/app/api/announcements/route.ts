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

// GET /api/announcements?status=PUBLISHED
// Publik: hanya PUBLISHED. Developer/Wali Kelas: bisa lihat semua via ?all=1
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wantAll = searchParams.get("all") === "1";
    const user = await getSessionUser();

    const canSeeAll =
      user &&
      ((user.role === "DEVELOPER") ||
        (user.role === "WALI_KELAS" && wantAll));

    const announcements = await prisma.announcement.findMany({
      where: canSeeAll ? {} : { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "announcements:create");
  }
}
