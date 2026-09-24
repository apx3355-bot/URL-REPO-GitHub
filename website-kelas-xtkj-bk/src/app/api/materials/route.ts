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

// GET /api/materials?q=&subject= — login semua role.
// Anggota hanya melihat PUBLISHED; fileData tidak pernah ikut di list.
export async function GET(request: Request) {
  try {
    const guard = await requirePermission("materials", "read");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const subject = searchParams.get("subject")?.trim() || "";

    const materials = await prisma.material.findMany({
      where: {
        ...(guard.user.role === "ANGGOTA" ? { status: "PUBLISHED" } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { subject: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(subject ? { subject: { contains: subject, mode: "insensitive" as const } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        subject: true,
        externalUrl: true,
        fileName: true,
        fileSize: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { username: true, profile: { select: { fullName: true } } },
        },
      },
    });

    // daftar subject unik untuk filter (dari data yang terlihat)
    const isAnggota = guard.user.role === "ANGGOTA";
    const subjects = isAnggota
      ? [...new Set(materials.map((m) => m.subject).filter(Boolean))]
      : (
          await prisma.material.findMany({
            where: {},
            select: { subject: true },
            distinct: ["subject"],
          })
        ).map((m) => m.subject).filter(Boolean);

    return NextResponse.json({ materials, subjects });
  } catch (error) {
    return handleApiError(error, "materials:list");
  }
}

const optionalFile = z
  .object({
    dataUrl: z.string(),
    name: z.string().trim().max(160),
  })
  .optional()
  .nullable();

const upsertSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  subject: z.string().trim().max(80).optional().or(z.literal("")),
  externalUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), {
      message: "URL harus dimulai dengan http:// atau https://",
    })
    .optional()
    .or(z.literal("")),
  status: z.enum(["PUBLISHED", "DRAFT"]).default("PUBLISHED"),
  file: optionalFile,
});

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("materials", "create");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, upsertSchema);
    if (!body.ok) return body.response;
    const d = body.data;

    // Validasi lampiran (magic bytes) — jika ada
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

    const material = await prisma.material.create({
      data: {
        title: d.title,
        description: d.description || null,
        subject: d.subject || null,
        externalUrl: d.externalUrl || null,
        status: d.status,
        fileName: fileMeta?.name ?? null,
        fileMime: fileMeta?.mime ?? null,
        fileSize: fileMeta?.size ?? null,
        fileData,
        authorId: guard.user.id,
      },
      select: {
        id: true,
        title: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "MATERIAL_CREATE",
      description: `${guard.user.username} menambahkan materi "${material.title}"`,
      targetType: "material",
      targetId: material.id,
    });

    // Notifikasi materi baru — hanya saat PUBLISHED (draft tidak menotifikasi)
    let notified = 0;
    if (material.status === "PUBLISHED") {
      notified = await notifyUsers({
        excludeUserId: guard.user.id,
        type: "MATERIAL",
        message: `Materi baru: ${material.title}`,
        link: "/dashboard/materi",
        targetType: "material",
        targetId: material.id,
      });
    }

    return NextResponse.json({ material, notified }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "materials:create");
  }
}
