import { NextResponse } from "next/server";
import type { z } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { can, type PermissionAction } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// ================================
// Helper API: auth, permission, validasi, error handling, activity log
// ================================

export function jsonError(
  message: string,
  status: number,
  fields?: Record<string, string>
) {
  return NextResponse.json({ error: message, fields }, { status });
}

export type ApiGuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/** Wajib login. */
export async function requireUser(): Promise<ApiGuardResult> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: jsonError("Anda harus login terlebih dahulu.", 401),
    };
  }
  return { ok: true, user };
}

/** Wajib login + permission resource:action. */
export async function requirePermission(
  resource: string,
  action: PermissionAction
): Promise<ApiGuardResult> {
  const guard = await requireUser();
  if (!guard.ok) return guard;
  if (!can(guard.user.role, resource, action)) {
    return {
      ok: false,
      response: jsonError("Anda tidak memiliki izin untuk aksi ini.", 403),
    };
  }
  return guard;
}

/** Parse & validasi body JSON dengan zod schema. */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonError("Body JSON tidak valid.", 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      ok: false,
      response: jsonError("Data tidak valid.", 400, fields),
    };
  }
  return { ok: true, data: result.data };
}

/** Handler error terpusat — tidak bocorkan detail internal. */
export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`[API:${context}]`, error);
  return jsonError("Terjadi kesalahan pada server. Coba lagi nanti.", 500);
}

/** Catat aktivitas ke activity_logs (best-effort, tidak menggagalkan request). */
export async function logActivity(params: {
  userId: number | null;
  action: string;
  description: string;
  targetType?: string;
  targetId?: number;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        description: params.description,
        targetType: params.targetType,
        targetId: params.targetId,
      },
    });
  } catch (error) {
    console.error("[activity-log] gagal mencatat aktivitas:", error);
  }
}
