import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  handleApiError,
  jsonError,
  logActivity,
} from "@/lib/api";
import { can } from "@/lib/roles";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// DELETE /api/discussions/[id] — hapus postingan:
// - pemilik posting selalu boleh (beserta balasannya, cascade)
// - moderator (wali/developer) boleh hapus milik orang lain → tercatat di activity log
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

    const post = await prisma.discussionPost.findUnique({
      where: { id },
      select: { id: true, userId: true, content: true },
    });
    if (!post) return jsonError("Postingan tidak ditemukan.", 404);

    const isOwner = post.userId === guard.user.id;
    const isModerator = can(guard.user.role, "discussions", "moderate");
    if (!isOwner && !isModerator) {
      return jsonError("Anda hanya dapat menghapus postingan milik Anda.", 403);
    }

    await prisma.discussionPost.delete({ where: { id } });

    await logActivity({
      userId: guard.user.id,
      action: isOwner ? "DISCUSSION_DELETE" : "DISCUSSION_MODERATE",
      description: isOwner
        ? `${guard.user.username} menghapus postingan diskusi #${id}`
        : `${guard.user.username} (moderator) menghapus postingan diskusi #${id} milik user #${post.userId}`,
      targetType: "discussion",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "discussions:delete");
  }
}
