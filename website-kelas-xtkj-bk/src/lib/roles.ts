// Role & permission definitions — Phase 3 & 5
// Server-side source of truth. Frontend HANYA menampilkan UI sesuai matrix ini;
// setiap API wajib memanggil can()/canAny() via requirePermission().
export const ROLES = ["DEVELOPER", "WALI_KELAS", "ANGGOTA"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "moderate"
  | "upload";

const PERMISSIONS: Record<Role, Record<string, PermissionAction[]>> = {
  DEVELOPER: {
    announcements: ["read", "create", "update", "delete"],
    members: ["read", "create", "update", "delete"],
    structure: ["read", "create", "update", "delete"],
    schedules: ["read", "create", "update", "delete"],
    activityLogs: ["read"],
    // User management: developer TIDAK boleh melihat/mengubah secret
    // (password hash tidak pernah diekspos lewat API users)
    users: ["read", "update", "delete", "moderate", "create"],
    gallery: ["read", "create", "update", "delete", "moderate"],
    profile: ["read", "update"],
    // Settings & kuota: hanya developer (matrix Phase 6)
    settings: ["read", "update"],
  },
  WALI_KELAS: {
    announcements: ["read", "create", "update"],
    members: ["read", "update"],
    structure: ["read", "update"],
    schedules: ["read", "create", "update"],
    activityLogs: [],
    users: [],
    // Moderasi galeri: bagian tanggung jawab wali kelas (approve/reject)
    gallery: ["read", "moderate"],
    profile: ["read", "update"],
    settings: [],
  },
  ANGGOTA: {
    announcements: ["read"],
    members: ["read"],
    structure: ["read"],
    schedules: ["read"],
    activityLogs: [],
    users: [],
    // Murid boleh upload foto ke galeri + kelola/menghapus miliknya sendiri
    gallery: ["read", "create", "upload"],
    profile: ["read", "update"],
    settings: [],
  },
};

/** Cek permission di sisi server. */
export function can(
  role: Role,
  resource: string,
  action: PermissionAction
): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}

/** Cek beberapa action sekaligus (OR). */
export function canAny(
  role: Role,
  resource: string,
  actions: PermissionAction[]
): boolean {
  return actions.some((a) => can(role, resource, a));
}

/** Label tampilan role */
export const ROLE_LABELS: Record<Role, string> = {
  DEVELOPER: "Developer",
  WALI_KELAS: "Wali Kelas",
  ANGGOTA: "Murid",
};

/** Halaman dashboard sesuai role */
export const ROLE_HOME: Record<Role, string> = {
  DEVELOPER: "/dashboard",
  WALI_KELAS: "/dashboard",
  ANGGOTA: "/dashboard",
};

/** Public registration HANYA untuk murid. */
export const REGISTRATION_ROLE: Role = "ANGGOTA";
