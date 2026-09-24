import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  parseBody,
  handleApiError,
  jsonError,
  logActivity,
} from "@/lib/api";
import { can } from "@/lib/roles";
import { notifyUser } from "@/lib/notify";
import { rateLimit } from "@/lib/rateLimit";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const replySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Balasan tidak boleh kosong")
    .max(1000, "Balasan maksimal 1000 karakter"),
});

// POST /api/discussions/[id]/replies — balas postingan (semua role login).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("discussions", "create");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const postId = parseId(rawId);
    if (!postId) return jsonError("ID tidak valid.", 400);

    // Anti spam: 10 balasan / menit per user
    const limit = rateLimit(`reply:user:${guard.user.id}`, 10, 60_000);
    if (!limit.allowed) {
      return Response.json(
        { error: "Terlalu banyak balasan. Tunggu sebentar." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const post = await prisma.discussionPost.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });
    if (!post) return jsonError("Postingan tidak ditemukan.", 404);

    const body = await parseBody(request, replySchema);
    if (!body.ok) return body.response;

    const reply = await prisma.discussionReply.create({
      data: { postId, userId: guard.user.id, content: body.data.content },
      include: {
        user: { select: { username: true, profile: { select: { fullName: true, photo: true } } } },
      },
    });

    // Notifikasi pemilik posting (bukan balasan sendiri)
    if (post.userId !== guard.user.id) {
      await notifyUser({
        userId: post.userId,
        type: "DISCUSSION_REPLY",
        message: `${guard.user.fullName} membalas diskusi Anda`,
        link: "/dashboard/discussions",
        targetType: "discussion",
        targetId: postId,
      });
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "replies:create");
  }
}

// DELETE /api/discussions/[id]/replies — hapus balasan:
// - pemilik balasan selalu boleh
// - moderator (discussions:delete tanpa moderate → anggota TIDAK punya) aturannya:
//   pemilik ATAU role dengan discussions:moderate (wali/developer)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("discussions", "delete");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const reply = await prisma.discussionReply.findUnique({
      where: { id },
      select: { id: true, userId: true, postId: true, content: true },
    });
    if (!reply) return jsonError("Balasan tidak ditemukan.", 404);

    const isOwner = reply.userId === guard.user.id;
    const isModerator = can(guard.user.role, "discussions", "moderate");
    if (!isOwner && !isModerator) {
      return jsonError("Anda hanya dapat menghapus balasan milik Anda.", 403);
    }

    await prisma.discussionReply.delete({ where: { id } });

    if (!isOwner) {
      await logActivity({
        userId: guard.user.id,
        action: "DISCUSSION_MODERATE",
        description: `${guard.user.username} menghapus balasan #${id} (milik user #${reply.userId})`,
        targetType: "discussion",
        targetId: reply.postId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "replies:delete");
  }
}
