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
import {
  validateDocFile,
  MATERIAL_FILE_MAX_BASE64,
} from "@/lib/fileValidation";

// GET /api/assignments/[id] — detail tugas.
// Anggota hanya PUBLISHED; fileData tidak dikirim (pakai endpoint /file).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("assignments", "read");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        author: {
          select: { username: true, profile: { select: { fullName: true } } },
        },
      },
    });
    if (!assignment) return jsonError("Tugas tidak ditemukan.", 404);
    if (guard.user.role === "ANGGOTA" && assignment.status !== "PUBLISHED") {
      return jsonError("Tugas tidak ditemukan.", 404);
    }
    const { fileData: _omit, ...safe } = assignment;
    void _omit;

    // Anggota: sertakan submission miliknya
    let mySubmission = null;
    if (guard.user.role === "ANGGOTA") {
      mySubmission = await prisma.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId: id, studentId: guard.user.id } },
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
        },
      });
    }

    return NextResponse.json({ assignment: safe, mySubmission });
  } catch (error) {
    return handleApiError(error, "assignments:detail");
  }
}

const updateSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160).optional(),
  description: z.string().trim().min(5, "Instruksi minimal 5 karakter").max(4000).optional(),
  dueDate: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "Deadline tidak valid",
    })
    .optional(),
  status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  removeFile: z.boolean().optional(),
  file: z
    .object({ dataUrl: z.string(), name: z.string().trim().max(160) })
    .optional()
    .nullable(),
});

// PATCH — wali: milik sendiri; developer: semua.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("assignments", "update");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) return jsonError("Tugas tidak ditemukan.", 404);
    if (guard.user.role === "WALI_KELAS" && existing.authorId !== guard.user.id) {
      return jsonError("Anda hanya dapat mengubah tugas milik Anda sendiri.", 403);
    }

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;
    const d = body.data;

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.dueDate !== undefined) {
      const due = new Date(d.dueDate);
      if (Number.isNaN(due.getTime())) return jsonError("Deadline tidak valid.", 400);
      data.dueDate = due;
    }
    if (d.status !== undefined) data.status = d.status;
    if (d.removeFile) {
      data.fileName = null;
      data.fileMime = null;
      data.fileData = null;
      data.fileSize = null;
    }
    if (d.file?.dataUrl) {
      const v = validateDocFile(d.file.dataUrl, MATERIAL_FILE_MAX_BASE64);
      if (!v.ok) {
        return NextResponse.json(
          { error: v.message, fields: { file: v.message } },
          { status: 400 }
        );
      }
      data.fileName = d.file.name;
      data.fileMime = v.meta.mime;
      data.fileData = d.file.dataUrl;
      data.fileSize = v.sizeBytes;
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data,
      select: { id: true, title: true, dueDate: true, status: true },
    });

    await logActivity({
      userId: guard.user.id,
      action: "ASSIGNMENT_UPDATE",
      description: `${guard.user.username} mengubah tugas "${assignment.title}"`,
      targetType: "assignment",
      targetId: assignment.id,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    return handleApiError(error, "assignments:update");
  }
}

// DELETE — wali: milik sendiri; developer: semua. Submissions ikut terhapus (cascade).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("assignments", "delete");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) return jsonError("Tugas tidak ditemukan.", 404);
    if (guard.user.role === "WALI_KELAS" && existing.authorId !== guard.user.id) {
      return jsonError("Anda hanya dapat menghapus tugas milik Anda sendiri.", 403);
    }

    await prisma.assignment.delete({ where: { id } });

    await logActivity({
      userId: guard.user.id,
      action: "ASSIGNMENT_DELETE",
      description: `${guard.user.username} menghapus tugas "${existing.title}"`,
      targetType: "assignment",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "assignments:delete");
  }
}
