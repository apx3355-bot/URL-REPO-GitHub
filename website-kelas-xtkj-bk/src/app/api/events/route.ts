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

// GET /api/events?q=&scope=upcoming|past|all — login semua role.
export async function GET(request: Request) {
  try {
    const guard = await requirePermission("events", "read");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const scope = searchParams.get("scope") || "all";
    const now = new Date();

    const events = await prisma.classEvent.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { location: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(scope === "upcoming" ? { eventDate: { gte: now } } : {}),
        ...(scope === "past" ? { eventDate: { lt: now } } : {}),
      },
      orderBy: scope === "past" ? { eventDate: "desc" } : { eventDate: "asc" },
      take: 100,
      include: {
        createdBy: {
          select: { username: true, profile: { select: { fullName: true } } },
        },
      },
    });

    return NextResponse.json({ events, now: now.toISOString() });
  } catch (error) {
    return handleApiError(error, "events:list");
  }
}

const createSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  /** "YYYY-MM-DD" dari <input type="date"> */
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
    .refine((s) => !Number.isNaN(new Date(s + "T00:00:00").getTime()), {
      message: "Tanggal tidak valid",
    }),
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

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("events", "create");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, createSchema);
    if (!body.ok) return body.response;

    const d = body.data;
    const event = await prisma.classEvent.create({
      data: {
        title: d.title,
        description: d.description || null,
        eventDate: new Date(d.eventDate + "T00:00:00"),
        startTime: d.startTime || null,
        endTime: d.endTime || null,
        location: d.location || null,
        createdById: guard.user.id,
      },
      include: {
        createdBy: {
          select: { username: true, profile: { select: { fullName: true } } },
        },
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "EVENT_CREATE",
      description: `${guard.user.username} membuat agenda "${event.title}"`,
      targetType: "event",
      targetId: event.id,
    });

    // Notifikasi agenda baru ke semua user aktif (kecuali pembuat)
    const sent = await notifyUsers({
      excludeUserId: guard.user.id,
      type: "EVENT",
      message: `Agenda baru: ${event.title}`,
      link: "/dashboard/agenda",
      targetType: "event",
      targetId: event.id,
    });

    return NextResponse.json({ event, notified: sent }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "events:create");
  }
}
