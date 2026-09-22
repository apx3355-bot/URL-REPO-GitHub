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
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100).optional(),
  nisn: z
    .string()
    .trim()
    .regex(/^\d{0,10}$/, "NISN harus angka maksimal 10 digit")
    .optional()
    .or(z.literal("")),
  position: z.string().trim().max(50).optional().or(z.literal("")),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("members", "update");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.classMember.findUnique({ where: { id } });
    if (!existing) return jsonError("Anggota tidak ditemukan.", 404);

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    const member = await prisma.classMember.update({
      where: { id },
      data: {
        ...(body.data.fullName !== undefined ? { fullName: body.data.fullName } : {}),
        ...(body.data.nisn !== undefined ? { nisn: body.data.nisn || null } : {}),
        ...(body.data.position !== undefined
          ? { position: body.data.position || null }
          : {}),
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "MEMBER_UPDATE",
      description: `${guard.user.username} mengubah data anggota "${member.fullName}"`,
      targetType: "member",
      targetId: id,
    });

    return NextResponse.json({ member });
  } catch (error) {
    return handleApiError(error, "members:update");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("members", "delete");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.classMember.findUnique({ where: { id } });
    if (!existing) return jsonError("Anggota tidak ditemukan.", 404);

    await prisma.classMember.delete({ where: { id } });

    await logActivity({
      userId: guard.user.id,
      action: "MEMBER_DELETE",
      description: `${guard.user.username} menghapus anggota "${existing.fullName}"`,
      targetType: "member",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "members:delete");
  }
}
