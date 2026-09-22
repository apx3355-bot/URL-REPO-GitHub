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
import { STRUCTURE_TIERS } from "@/lib/structure";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const updateSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100).optional(),
  position: z.string().trim().min(2, "Jabatan minimal 2 karakter").max(60).optional(),
  tier: z.enum(STRUCTURE_TIERS).optional(),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).max(99).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("structure", "update");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.classStructure.findUnique({ where: { id } });
    if (!existing) return jsonError("Data struktur tidak ditemukan.", 404);

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    const entry = await prisma.classStructure.update({
      where: { id },
      data: {
        ...(body.data.name !== undefined ? { name: body.data.name } : {}),
        ...(body.data.position !== undefined ? { position: body.data.position } : {}),
        ...(body.data.tier !== undefined ? { tier: body.data.tier } : {}),
        ...(body.data.description !== undefined
          ? { description: body.data.description || null }
          : {}),
        ...(body.data.order !== undefined ? { order: body.data.order } : {}),
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "STRUCTURE_UPDATE",
      description: `${guard.user.username} mengubah struktur "${entry.position} — ${entry.name}"`,
      targetType: "structure",
      targetId: id,
    });

    return NextResponse.json({ entry });
  } catch (error) {
    return handleApiError(error, "structure:update");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("structure", "delete");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.classStructure.findUnique({ where: { id } });
    if (!existing) return jsonError("Data struktur tidak ditemukan.", 404);

    await prisma.classStructure.delete({ where: { id } });

    await logActivity({
      userId: guard.user.id,
      action: "STRUCTURE_DELETE",
      description: `${guard.user.username} menghapus struktur "${existing.position} — ${existing.name}"`,
      targetType: "structure",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "structure:delete");
  }
}
