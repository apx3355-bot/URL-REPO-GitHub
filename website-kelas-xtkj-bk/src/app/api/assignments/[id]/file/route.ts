import { prisma } from "@/lib/prisma";
import { requirePermission, handleApiError, jsonError } from "@/lib/api";

// GET /api/assignments/[id]/file — unduh lampiran tugas.
// Anggota hanya boleh mengunduh lampiran tugas PUBLISHED.
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
      select: { fileName: true, fileMime: true, fileData: true, status: true },
    });
    if (!assignment || !assignment.fileData) {
      return jsonError("File tidak ditemukan.", 404);
    }
    if (guard.user.role === "ANGGOTA" && assignment.status !== "PUBLISHED") {
      return jsonError("File tidak ditemukan.", 404);
    }

    const buf = Buffer.from(assignment.fileData, "base64");
    const safeName = (assignment.fileName ?? "tugas").replace(/[^\w.\- ]+/g, "_");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": assignment.fileMime ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error, "assignments:file");
  }
}
