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
import {
  validateDocFile,
  MATERIAL_FILE_MAX_BASE64,
} from "@/lib/fileValidation";

// GET /api/assignments?q=&scope=active|past|all — login semua role.
// Anggota hanya melihat PUBLISHED. File data tidak pernah ikut di list.
export async function GET(request: Request) {
  try {
    const guard = await requirePermission("assignments", "read");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const scope = searchParams.get("scope") || "all";
    const now = new Date();

    const assignments = await prisma.assignment.findMany({
      where: {
        ...(guard.user.role === "ANGGOTA" ? { status: "PUBLISHED" } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(scope === "active" ? { dueDate: { gte: now } } : {}),
        ...(scope === "past" ? { dueDate: { lt: now } } : {}),
      },
      orderBy: { dueDate: "asc" },
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        fileName: true,
        fileSize: true,
        status: true,
        createdAt: true,
        author: {
          select: { username: true, profile: { select: { fullName: true } } },
        },
        // hitung submission untuk semua role (murid pakai utk status miliknya via _filter? Prisma take diff — simple: count all)
        _count: { select: { submissions: true } },
      },
    });

    // Untuk anggota, sertakan submission miliknya (status pengumpulan)
    let mySubmissions: Record<number, { id: number; submittedAt: string; isLate: boolean; grade: number | null; feedback: string | null }> = {};
    if (guard.user.role === "ANGGOTA") {
      const subs = await prisma.submission.findMany({
        where: { studentId: guard.user.id },
        select: {
          assignmentId: true,
          id: true,
          submittedAt: true,
          isLate: true,
          grade: true,
          feedback: true,
        },
      });
      mySubmissions = Object.fromEntries(
        subs.map((s) => [
          s.assignmentId,
          { id: s.id, submittedAt: s.submittedAt.toISOString(), isLate: s.isLate, grade: s.grade, feedback: s.feedback },
        ])
      );
    }

    return NextResponse.json({ assignments, mySubmissions, now: now.toISOString() });
  } catch (error) {
    return handleApiError(error, "assignments:list");
  }
}

const optionalFile = z
  .object({ dataUrl: z.string(), name: z.string().trim().max(160) })
  .optional()
  .nullable();

const createSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160),
  description: z
    .string()
    .trim()
    .min(5, "Instruksi minimal 5 karakter")
    .max(4000),
  /** ISO datetime-local string dari <input type="datetime-local"> */
  dueDate: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "Deadline tidak valid",
    }),
  status: z.enum(["PUBLISHED", "DRAFT"]).default("PUBLISHED"),
  file: optionalFile,
});

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("assignments", "create");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, createSchema);
    if (!body.ok) return body.response;
    const d = body.data;

    const dueDate = new Date(d.dueDate);
    // Deadline harus di masa depan (toleransi 1 menit)
    if (dueDate.getTime() < Date.now() - 60_000) {
      return NextResponse.json(
        { error: "Deadline harus di masa depan.", fields: { dueDate: "Deadline harus di masa depan." } },
        { status: 400 }
      );
    }

    let fileMeta: { name: string; mime: string; size: number } | null = null;
    let fileData: string | null = null;
    if (d.file?.dataUrl) {
      const v = validateDocFile(d.file.dataUrl, MATERIAL_FILE_MAX_BASE64);
      if (!v.ok) {
        return NextResponse.json(
          { error: v.message, fields: { file: v.message } },
          { status: 400 }
        );
      }
      fileMeta = { name: d.file.name, mime: v.meta.mime, size: v.sizeBytes };
      fileData = d.file.dataUrl;
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: d.title,
        description: d.description,
        dueDate,
        status: d.status,
        fileName: fileMeta?.name ?? null,
        fileMime: fileMeta?.mime ?? null,
        fileSize: fileMeta?.size ?? null,
        fileData,
        authorId: guard.user.id,
      },
      select: { id: true, title: true, dueDate: true, status: true },
    });

    await logActivity({
      userId: guard.user.id,
      action: "ASSIGNMENT_CREATE",
      description: `${guard.user.username} membuat tugas "${assignment.title}"`,
      targetType: "assignment",
      targetId: assignment.id,
    });

    let notified = 0;
    if (assignment.status === "PUBLISHED") {
      notified = await notifyUsers({
        excludeUserId: guard.user.id,
        type: "ASSIGNMENT",
        message: `Tugas baru: ${assignment.title}`,
        link: "/dashboard/tugas",
        targetType: "assignment",
        targetId: assignment.id,
      });
    }

    return NextResponse.json({ assignment, notified }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "assignments:create");
  }
}
