import { prisma } from "@/lib/prisma";
import { requirePermission, handleApiError, jsonError } from "@/lib/api";

// GET /api/submissions/[id]/file — unduh file submission.
// HANYA wali & developer (submissions:read). Murid TIDAK boleh mengunduh
// file submission milik siapa pun lewat endpoint ini — miliknya dilihat via detail.
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

    const sub = await prisma.submission.findUnique({
      where: { id },
      select: { fileName: true, fileMime: true, fileData: true },
    });
    if (!sub || !sub.fileData) return jsonError("File tidak ditemukan.", 404);

    const buf = Buffer.from(sub.fileData, "base64");
    const safeName = (sub.fileName ?? "submission").replace(/[^\w.\- ]+/g, "_");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": sub.fileMime ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error, "submissions:file");
  }
}
