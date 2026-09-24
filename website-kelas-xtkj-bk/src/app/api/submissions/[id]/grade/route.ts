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
import { notifyUser } from "@/lib/notify";

const gradeSchema = z.object({
  grade: z
    .number({ message: "Nilai harus berupa angka." })
    .int("Nilai harus bilangan bulat.")
    .min(0, "Nilai minimal 0.")
    .max(100, "Nilai maksimal 100."),
  feedback: z.string().trim().max(2000).optional().or(z.literal("")),
});

// POST /api/submissions/[id]/grade — beri / ubah nilai & feedback (wali & developer).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("submissions", "grade");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const sub = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        grade: true,
        feedback: true,
        assignment: { select: { id: true, title: true } },
        student: { select: { username: true } },
      },
    });
    if (!sub) return jsonError("Submission tidak ditemukan.", 404);

    const body = await parseBody(request, gradeSchema);
    if (!body.ok) return body.response;
    const d = body.data;

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        grade: d.grade,
        feedback: d.feedback || null,
        gradedById: guard.user.id,
        gradedAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        grade: true,
        feedback: true,
        gradedAt: true,
        assignmentId: true,
      },
    });

    const isUpdate = sub.grade !== null;
    await logActivity({
      userId: guard.user.id,
      action: isUpdate ? "SUBMISSION_REGRADE" : "SUBMISSION_GRADE",
      description: `${guard.user.username} memberi nilai ${d.grade} untuk tugas "${sub.assignment.title}" (${sub.student.username})`,
      targetType: "submission",
      targetId: id,
    });

    // Notifikasi ke murid pemilik submission
    await notifyUser({
      userId: sub.studentId,
      type: "GRADE",
      message: isUpdate
        ? `Nilai tugas "${sub.assignment.title}" diperbarui: ${d.grade}`
        : `Tugas "${sub.assignment.title}" dinilai: ${d.grade}`,
      link: "/dashboard/tugas",
      targetType: "submission",
      targetId: id,
    });

    return NextResponse.json({ submission: updated });
  } catch (error) {
    return handleApiError(error, "submissions:grade");
  }
}
