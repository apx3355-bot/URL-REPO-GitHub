import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  parseBody,
  handleApiError,
  logActivity,
  jsonError,
} from "@/lib/api";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const updateSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(120).optional(),
  content: z.string().trim().min(10, "Isi minimal 10 karakter").max(5000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("announcements", "update");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return jsonError("Pengumuman tidak ditemukan.", 404);

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    // Wali kelas hanya boleh mengubah pengumuman miliknya sendiri
    if (guard.user.role === "WALI_KELAS" && existing.authorId !== guard.user.id) {
      return jsonError("Anda hanya dapat mengubah pengumuman milik Anda.", 403);
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: body.data,
    });

    await logActivity({
      userId: guard.user.id,
      action: "ANNOUNCEMENT_UPDATE",
      description: `${guard.user.username} mengubah pengumuman "${announcement.title}"`,
      targetType: "announcement",
      targetId: id,
    });

    return NextResponse.json({ announcement });
  } catch (error) {
    return handleApiError(error, "announcements:update");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("announcements", "delete");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return jsonError("Pengumuman tidak ditemukan.", 404);

    await prisma.announcement.delete({ where: { id } });

    await logActivity({
      userId: guard.user.id,
      action: "ANNOUNCEMENT_DELETE",
      description: `${guard.user.username} menghapus pengumuman "${existing.title}"`,
      targetType: "announcement",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "announcements:delete");
  }
}
