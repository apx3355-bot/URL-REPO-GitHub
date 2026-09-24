import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  parseBody,
  handleApiError,
  logActivity,
} from "@/lib/api";
import { notifyUsers } from "@/lib/notify";

const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as const;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  try {
    const guard = await requirePermission("schedules", "read");
    if (!guard.ok) return guard.response;

    const dayOrder = DAYS;
    const schedules = await prisma.schedule.findMany({ take: 200 });
    schedules.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day as (typeof DAYS)[number]) -
        dayOrder.indexOf(b.day as (typeof DAYS)[number]);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
    return NextResponse.json({ schedules });
  } catch (error) {
    return handleApiError(error, "schedules:list");
  }
}

const createSchema = z
  .object({
    day: z.enum(DAYS),
    startTime: z.string().regex(timeRegex, "Format jam: HH:MM"),
    endTime: z.string().regex(timeRegex, "Format jam: HH:MM"),
    subject: z.string().trim().min(2, "Mata pelajaran minimal 2 karakter").max(80),
    teacher: z.string().trim().max(80).optional().or(z.literal("")),
    room: z.string().trim().max(40).optional().or(z.literal("")),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Jam selesai harus setelah jam mulai",
    path: ["endTime"],
  });

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("schedules", "create");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, createSchema);
    if (!body.ok) return body.response;

    const schedule = await prisma.schedule.create({
      data: {
        day: body.data.day,
        startTime: body.data.startTime,
        endTime: body.data.endTime,
        subject: body.data.subject,
        teacher: body.data.teacher || null,
        room: body.data.room || null,
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "SCHEDULE_CREATE",
      description: `${guard.user.username} menambah jadwal ${schedule.day} ${schedule.startTime} — ${schedule.subject}`,
      targetType: "schedule",
      targetId: schedule.id,
    });

    // Phase 12: perubahan jadwal menotifikasi user aktif (best-effort, anti-spam)
    await notifyUsers({
      excludeUserId: guard.user.id,
      type: "SCHEDULE",
      message: `Jadwal baru: ${schedule.subject} (${schedule.day} ${schedule.startTime})`,
      link: "/dashboard/schedules",
      targetType: "schedule",
      targetId: schedule.id,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "schedules:create");
  }
}
