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
  | "upload"
  | "grade";

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
    // Galeri: akses penuh + upload foto dokumentasi (masuk alur moderasi)
    gallery: ["read", "create", "update", "delete", "moderate", "upload"],
    profile: ["read", "update"],
    // Settings & kuota: hanya developer (matrix Phase 6)
    settings: ["read", "update"],
    // Diskusi & agenda: akses penuh + moderasi
    discussions: ["read", "create", "delete", "moderate"],
    events: ["read", "create", "update", "delete"],
    // Akademik: akses penuh (kelola materi/tugas, lihat semua submission, nilai)
    materials: ["read", "create", "update", "delete"],
    assignments: ["read", "create", "update", "delete"],
    submissions: ["read", "grade", "delete"],
  },
  WALI_KELAS: {
    announcements: ["read", "create", "update"],
    members: ["read", "update"],
    structure: ["read", "update"],
    schedules: ["read", "create", "update"],
    activityLogs: [],
    users: [],
    // Galeri: wali kelas mengelola & mengunggah foto dokumentasi kelas juga
    // (upload tetap masuk PENDING → dimoderasi sesuai alur Phase 5)
    gallery: ["read", "moderate", "upload"],
    profile: ["read", "update"],
    settings: [],
    // Diskusi: ikut serta + moderasi konten siapa pun
    discussions: ["read", "create", "delete", "moderate"],
    // Agenda: mengelola kegiatan kelas
    events: ["read", "create", "update", "delete"],
    // Akademik: wali kelas mengelola materi/tugas, menilai submission
    materials: ["read", "create", "update", "delete"],
    assignments: ["read", "create", "update", "delete"],
    submissions: ["read", "grade", "delete"],
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
    // Diskusi: semua role login boleh berpartisipasi (hapus milik sendiri)
    discussions: ["read", "create", "delete"],
    // Agenda: murid hanya melihat
    events: ["read"],
    // Akademik: murid membaca materi/tugas, mengumpulkan & melihat nilai miliknya
    materials: ["read"],
    assignments: ["read"],
    submissions: ["create"],
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
