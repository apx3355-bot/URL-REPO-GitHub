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
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
    .optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam tidak valid (HH:MM)")
    .optional()
    .or(z.literal("")),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam tidak valid (HH:MM)")
    .optional()
    .or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("events", "update");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.classEvent.findUnique({ where: { id } });
    if (!existing) return jsonError("Agenda tidak ditemukan.", 404);

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    const d = body.data;
    const event = await prisma.classEvent.update({
      where: { id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.eventDate ? { eventDate: new Date(d.eventDate + "T00:00:00") } : {}),
        ...(d.startTime !== undefined ? { startTime: d.startTime || null } : {}),
        ...(d.endTime !== undefined ? { endTime: d.endTime || null } : {}),
        ...(d.location !== undefined ? { location: d.location || null } : {}),
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "EVENT_UPDATE",
      description: `${guard.user.username} mengubah agenda "${event.title}"`,
      targetType: "event",
      targetId: id,
    });

    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error, "events:update");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("events", "delete");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.classEvent.findUnique({ where: { id } });
    if (!existing) return jsonError("Agenda tidak ditemukan.", 404);

    await prisma.classEvent.delete({ where: { id } });

    await logActivity({
      userId: guard.user.id,
      action: "EVENT_DELETE",
      description: `${guard.user.username} menghapus agenda "${existing.title}"`,
      targetType: "event",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "events:delete");
  }
}
