import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, type PermissionAction } from "@/lib/roles";
import {
  requirePermission,
  requireUser,
  parseBody,
  handleApiError,
  logActivity,
  jsonError,
} from "@/lib/api";
import { deleteUploadFile } from "@/lib/upload";
import { notifyUser } from "@/lib/notify";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const moderateSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission("gallery", "moderate");
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.galleryItem.findUnique({ where: { id } });
    if (!existing) return jsonError("Item galeri tidak ditemukan.", 404);

    const body = await parseBody(request, moderateSchema);
    if (!body.ok) return body.response;

    const status = body.data.action === "approve" ? "APPROVED" : "REJECTED";
    const item = await prisma.galleryItem.update({
      where: { id },
      data: {
        status,
        approvedBy: guard.user.id,
        approvedAt: status === "APPROVED" ? new Date() : null,
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: status === "APPROVED" ? "GALLERY_APPROVE" : "GALLERY_REJECT",
      description: `${guard.user.username} ${status === "APPROVED" ? "menyetujui" : "menolak"} foto "${existing.title}"`,
      targetType: "gallery",
      targetId: id,
    });

    // Notifikasi hasil moderasi ke pemilik foto (Phase 11)
    if (existing.userId !== guard.user.id) {
      await notifyUser({
        userId: existing.userId,
        type: "GALLERY",
        message:
          status === "APPROVED"
            ? `Foto "${existing.title}" telah disetujui dan tampil di galeri`
            : `Foto "${existing.title}" tidak disetujui moderator`,
        link: "/dashboard/gallery",
        targetType: "gallery",
        targetId: id,
      });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error, "gallery:moderate");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Delete gallery = developer (gallery:delete) hapus bebas,
    // atau pemilik foto (gallery:upload) hapus miliknya sendiri.
    // requirePermission("gallery","delete") menolak murid sebelum
    // ownership check tercapai, jadi dipecah menjadi guard + policy di sini.
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return jsonError("ID tidak valid.", 400);

    const existing = await prisma.galleryItem.findUnique({ where: { id } });
    if (!existing) return jsonError("Item galeri tidak ditemukan.", 404);

    // Policy delete:
    //   - DEVELOPER (gallery:delete)  -> hapus konten siapa pun
    //   - ANGGOTA   (gallery:upload)  -> hanya foto miliknya sendiri
    //   - WALI_KELAS (moderate saja)  -> tidak bisa delete (sesuai matrix permission)
    const canDeleteAny = can(guard.user.role, "gallery", "delete");
    const canDeleteOwn = can(guard.user.role, "gallery", "upload");
    if (!canDeleteAny && !(canDeleteOwn && existing.userId === guard.user.id)) {
      return jsonError("Anda tidak memiliki izin menghapus foto ini.", 403);
    }

    await prisma.galleryItem.delete({ where: { id } });
    // File lama (pola Phase 5) dihapus jika ada; data URL (serverless) tak berfile
    if (!existing.imagePath.startsWith("data:")) {
      await deleteUploadFile(existing.imagePath);
    }

    await logActivity({
      userId: guard.user.id,
      action: "GALLERY_DELETE",
      description: `${guard.user.username} menghapus foto "${existing.title}"`,
      targetType: "gallery",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "gallery:delete");
  }
}

// Ekspor tipe agar bisa dipakai UI bila diperlukan (tidak dipakai runtime)
export type GalleryModerateAction = z.infer<typeof moderateSchema>;
export type _PermissionActionRef = PermissionAction;
