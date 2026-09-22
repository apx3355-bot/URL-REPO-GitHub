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

const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as const;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const updateSchema = z
  .object({
    day: z.enum(DAYS).optional(),
    startTime: z.string().regex(timeRegex, "Format jam: HH:MM").optional(),
    endTime: z.string().regex(timeRegex, "Format jam: HH:MM").optional(),
    subject: z.string().trim().min(2).max(80).optional(),
    teacher: z.string().trim().max(80).optional().or(z.literal("")),
    room: z.string().trim().max(40).optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      !data.startTime ||
      !data.endTime ||
      data.startTime < data.endTime,
    { message: "Jam selesai harus setelah jam mulai", path: ["endTime"] }
  );

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("schedules", "update");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) return jsonError("Jadwal tidak ditemukan.", 404);

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        ...(body.data.day !== undefined ? { day: body.data.day } : {}),
        ...(body.data.startTime !== undefined ? { startTime: body.data.startTime } : {}),
        ...(body.data.endTime !== undefined ? { endTime: body.data.endTime } : {}),
        ...(body.data.subject !== undefined ? { subject: body.data.subject } : {}),
        ...(body.data.teacher !== undefined ? { teacher: body.data.teacher || null } : {}),
        ...(body.data.room !== undefined ? { room: body.data.room || null } : {}),
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "SCHEDULE_UPDATE",
      description: `${guard.user.username} mengubah jadwal ${schedule.day} ${schedule.startTime}`,
      targetType: "schedule",
      targetId: id,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    return handleApiError(error, "schedules:update");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("schedules", "delete");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) return jsonError("Jadwal tidak ditemukan.", 404);

    await prisma.schedule.delete({ where: { id } });

    await logActivity({
      userId: guard.user.id,
      action: "SCHEDULE_DELETE",
      description: `${guard.user.username} menghapus jadwal ${existing.day} ${existing.startTime} — ${existing.subject}`,
      targetType: "schedule",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "schedules:delete");
  }
}
