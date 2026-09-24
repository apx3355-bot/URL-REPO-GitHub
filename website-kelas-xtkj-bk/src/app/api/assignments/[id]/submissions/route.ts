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
import { notifyUser, notifyUsers } from "@/lib/notify";
import {
  validateDocFile,
  SUBMISSION_FILE_MAX_BASE64,
} from "@/lib/fileValidation";

// GET /api/assignments/[id]/submissions — daftar submission satu tugas.
// Hanya wali & developer (submissions:read).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("submissions", "read");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: { id: true, title: true, dueDate: true },
    });
    if (!assignment) return jsonError("Tugas tidak ditemukan.", 404);

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: id },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        note: true,
        fileName: true,
        fileSize: true,
        submittedAt: true,
        isLate: true,
        grade: true,
        feedback: true,
        gradedAt: true,
        student: {
          select: { username: true, profile: { select: { fullName: true } } },
        },
      },
    });

    return NextResponse.json({ assignment, submissions });
  } catch (error) {
    return handleApiError(error, "submissions:list");
  }
}

const optionalFile = z
  .object({ dataUrl: z.string(), name: z.string().trim().max(160) })
  .optional()
  .nullable();

const submitSchema = z.object({
  note: z.string().trim().max(4000).optional().or(z.literal("")),
  removeFile: z.boolean().optional(),
  file: optionalFile,
});

// POST /api/assignments/[id]/submissions — kumpul / revisi submission (murid).
// Satu submission per tugas per murid (unique constraint) — POST ulang = revisi.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("submissions", "create");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: { id: true, title: true, dueDate: true, status: true },
    });
    if (!assignment || assignment.status !== "PUBLISHED") {
      return jsonError("Tugas tidak ditemukan.", 404);
    }

    const body = await parseBody(request, submitSchema);
    if (!body.ok) return body.response;
    const d = body.data;

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId: guard.user.id } },
      select: { id: true, grade: true, gradedAt: true },
    });

    // Aturan: setelah dinilai, submission dikunci (tidak bisa revisi sendiri).
    if (existing?.gradedAt) {
      return jsonError(
        "Tugas sudah dinilai dan tidak dapat diubah. Hubungi wali kelas jika perlu revisi.",
        409
      );
    }

    let fileMeta: { name: string; mime: string; size: number } | null = null;
    let fileData: string | null = null;
    if (d.file?.dataUrl) {
      const v = validateDocFile(d.file.dataUrl, SUBMISSION_FILE_MAX_BASE64);
      if (!v.ok) {
        return NextResponse.json(
          { error: v.message, fields: { file: v.message } },
          { status: 400 }
        );
      }
      fileMeta = { name: d.file.name, mime: v.meta.mime, size: v.sizeBytes };
      fileData = d.file.dataUrl;
    }

    // Hitung telat/tepat: terhadap deadline saat ini
    const isLate = Date.now() > assignment.dueDate.getTime();

    // Verifikasi wajib: minimal catatan ATAU file
    const hasNote = !!d.note;
    const hasFile = !!fileData || (!!existing && !d.removeFile && false); // file existing tetap dianggap ada jika tidak diremove
    if (!hasNote && !hasFile && !existing) {
      return jsonError("Sertakan catatan jawaban atau file lampiran.", 400);
    }

    const data: Record<string, unknown> = {
      submittedAt: new Date(),
      isLate,
      updatedAt: new Date(),
    };
    if (d.note !== undefined) data.note = d.note || null;
    if (d.removeFile) {
      data.fileName = null;
      data.fileMime = null;
      data.fileData = null;
      data.fileSize = null;
    }
    if (fileData) {
      data.fileName = fileMeta!.name;
      data.fileMime = fileMeta!.mime;
      data.fileData = fileData;
      data.fileSize = fileMeta!.size;
    }

    let submission;
    if (existing) {
      // Revisi: reset nilai? Tidak — nilai hanya direset jika gradedAt null (tidak pernah dinilai).
      // Jika pernah dinilai lalu di-ungrade, grade tetap (grading terpisah).
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data,
        select: { id: true, submittedAt: true, isLate: true },
      });
    } else {
      if (!d.note && !fileData) {
        return jsonError("Sertakan catatan jawaban atau file lampiran.", 400);
      }
      submission = await prisma.submission.create({
        data: {
          assignmentId: id,
          studentId: guard.user.id,
          note: d.note || null,
          fileName: fileMeta?.name ?? null,
          fileMime: fileMeta?.mime ?? null,
          fileSize: fileMeta?.size ?? null,
          fileData,
          isLate,
        },
        select: { id: true, submittedAt: true, isLate: true },
      });
    }

    await logActivity({
      userId: guard.user.id,
      action: existing ? "SUBMISSION_UPDATE" : "SUBMISSION_CREATE",
      description: `${guard.user.username} ${existing ? "merevisi" : "mengumpulkan"} tugas "${assignment.title}"`,
      targetType: "submission",
      targetId: submission.id,
    });

    // Notifikasi ke pembuat tugas (wali/developer) — anti spam: maks ke beberapa penerima
    const notified = await notifyUsers({
      roles: ["WALI_KELAS", "DEVELOPER"],
      excludeUserId: guard.user.id,
      type: "SUBMISSION",
      message: `${guard.user.username} ${existing ? "merevisi" : "mengumpulkan"} tugas: ${assignment.title}`,
      link: "/dashboard/tugas",
      targetType: "assignment",
      targetId: assignment.id,
    });

    return NextResponse.json(
      { submission, revised: !!existing, notified },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    return handleApiError(error, "submissions:submit");
  }
}
