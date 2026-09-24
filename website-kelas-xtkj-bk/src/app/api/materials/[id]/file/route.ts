import { prisma } from "@/lib/prisma";
import { requirePermission, handleApiError, jsonError } from "@/lib/api";

// GET /api/materials/[id]/file — unduh lampiran materi.
// Semua role login boleh membaca materi PUBLISHED (anggota included);
// draft hanya untuk wali/developer (author via route utama sudah menolak).
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
      select: { fileName: true, fileMime: true, fileData: true, status: true },
    });
    if (!material || !material.fileData) return jsonError("File tidak ditemukan.", 404);
    if (guard.user.role === "ANGGOTA" && material.status !== "PUBLISHED") {
      return jsonError("File tidak ditemukan.", 404);
    }

    const buf = Buffer.from(material.fileData!, "base64");
    const safeName = (material.fileName ?? "materi").replace(/[^\w.\- ]+/g, "_");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": material.fileMime ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error, "materials:file");
  }
}
