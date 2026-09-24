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

// GET /api/materials/[id] — detail + data file (untuk owner materi, wali & developer).
// Anggota hanya boleh melihat materi PUBLISHED.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("materials", "read");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        author: {
          select: { username: true, profile: { select: { fullName: true } } },
        },
      },
    });
    if (!material) return jsonError("Materi tidak ditemukan.", 404);
    if (guard.user.role === "ANGGOTA" && material.status !== "PUBLISHED") {
      return jsonError("Materi tidak ditemukan.", 404); // jangan bocorkan keberadaan draft
    }

    return NextResponse.json({ material });
  } catch (error) {
    return handleApiError(error, "materials:detail");
  }
}

const updateSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160).optional(),
  description: z.string().trim().max(4000).optional(),
  subject: z.string().trim().max(80).optional(),
  externalUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), {
      message: "URL harus dimulai dengan http:// atau https://",
    })
    .optional(),
  status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  removeFile: z.boolean().optional(),
  file: z
    .object({ dataUrl: z.string(), name: z.string().trim().max(160) })
    .optional()
    .nullable(),
});

// PATCH — edit materi. Wali: hanya materi buatannya sendiri; Developer: semua.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("materials", "update");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) return jsonError("Materi tidak ditemukan.", 404);
    if (guard.user.role === "WALI_KELAS" && existing.authorId !== guard.user.id) {
      return jsonError("Anda hanya dapat mengubah materi milik Anda sendiri.", 403);
    }

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;
    const d = body.data;

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description || null;
    if (d.subject !== undefined) data.subject = d.subject || null;
    if (d.externalUrl !== undefined) data.externalUrl = d.externalUrl || null;
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

    const material = await prisma.material.update({
      where: { id },
      data,
      select: { id: true, title: true, status: true, updatedAt: true },
    });

    await logActivity({
      userId: guard.user.id,
      action: "MATERIAL_UPDATE",
      description: `${guard.user.username} mengubah materi "${material.title}"`,
      targetType: "material",
      targetId: material.id,
    });

    return NextResponse.json({ material });
  } catch (error) {
    return handleApiError(error, "materials:update");
  }
}

// DELETE — wali: milik sendiri; developer: semua.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("materials", "delete");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) return jsonError("Materi tidak ditemukan.", 404);
    if (guard.user.role === "WALI_KELAS" && existing.authorId !== guard.user.id) {
      return jsonError("Anda hanya dapat menghapus materi milik Anda sendiri.", 403);
    }

    await prisma.material.delete({ where: { id } });

    await logActivity({
      userId: guard.user.id,
      action: "MATERIAL_DELETE",
      description: `${guard.user.username} menghapus materi "${existing.title}"`,
      targetType: "material",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "materials:delete");
  }
}

// GET file — dipisah agar list tetap ringan: /api/materials/[id]/file
export async function HEAD() {
  return new Response(null, { status: 204 });
}
