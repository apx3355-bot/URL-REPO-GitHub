import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, parseBody, handleApiError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// GET /api/discussions?q= — daftar postingan (login). Terbaru dulu + balasan.
export async function GET(request: Request) {
  try {
    const guard = await requirePermission("discussions", "read");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    const posts = await prisma.discussionPost.findMany({
      where: q ? { content: { contains: q, mode: "insensitive" as const } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { username: true, profile: { select: { fullName: true, photo: true } } } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { username: true, profile: { select: { fullName: true, photo: true } } } },
          },
        },
      },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    return handleApiError(error, "discussions:list");
  }
}

const createSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(2000, "Pesan maksimal 2000 karakter"),
});

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("discussions", "create");
    if (!guard.ok) return guard.response;

    // Anti spam sederhana: 5 posting / menit per user
    const limit = rateLimit(`discussion:user:${guard.user.id}`, 5, 60_000);
    if (!limit.allowed) {
      return Response.json(
        { error: "Terlalu banyak posting. Tunggu sebentar." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await parseBody(request, createSchema);
    if (!body.ok) return body.response;

    const post = await prisma.discussionPost.create({
      data: { userId: guard.user.id, content: body.data.content },
      include: {
        user: { select: { username: true, profile: { select: { fullName: true, photo: true } } } },
        replies: { include: { user: { select: { username: true } } } },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "discussions:create");
  }
}
