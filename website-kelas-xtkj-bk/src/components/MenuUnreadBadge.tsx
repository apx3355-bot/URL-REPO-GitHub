"use client";

// ================================
// Badge jumlah notifikasi belum dibaca per item menu drawer — MAINTENANCE.
// Desain:
// - fetch dilakukan oleh PENGANGGANG (DashboardShell) hanya saat drawer
//   terbuka — zero polling saat drawer tertutup (hemat baterai & server).
// - State dibagikan lewat module store sederhana; semua instance badge
//   ter-render sinkron dari satu sumber.
// - Hanya tipe notifikasi yang punya menu terkait dipetakan; tipe lain
//   diabaikan (tidak ada badge palsu). Moderator tidak diberi badge GALLERY
//   (sudah ada PendingGalleryBadge khusus di item Galeri).
// - Tampilan clamp 9+; disembunyikan total saat 0 (tanpa elemen kosong).
// ================================

import { useSyncExternalStore } from "react";

export interface UnreadByType {
  [type: string]: number;
}

// ---- Store modul sederhana (satu sumber untuk semua badge) ----
let unreadByType: UnreadByType = {};
const listeners = new Set<() => void>();
let fetchTimer: ReturnType<typeof setInterval> | null = null;

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const getSnapshot = () => unreadByType;

export function refreshUnreadByType(): void {
  fetch("/api/notifications")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      // API groupBy mengembalikan array [{type, _count:{_all}}] —
      // normalisasi menjadi Record<type, count> untuk lookup O(1).
      const raw = d?.unreadByType;
      unreadByType = Array.isArray(raw)
        ? Object.fromEntries(raw.map((row) => [row.type, row._count?._all ?? 0]))
        : (raw ?? {});
      emit();
    })
    .catch(() => {
      // best-effort — biarkan data lama
    });
}

/** Dipanggil DashboardShell saat drawer dibuka/ditutup. */
export function setDrawerTicker(open: boolean): void {
  if (open) {
    refreshUnreadByType();
    if (!fetchTimer) {
      fetchTimer = setInterval(() => {
        // Hemat: skip saat tab tidak terlihat (pola PendingGalleryBadge)
        if (document.visibilityState === "visible") refreshUnreadByType();
      }, 60_000);
    }
  } else if (fetchTimer) {
    clearInterval(fetchTimer);
    fetchTimer = null;
    unreadByType = {};
    emit();
  }
}

// ---- Pemetaan tipe notifikasi -> href menu drawer ----
const TYPE_TO_MENU: Record<string, string> = {
  ANNOUNCEMENT: "/dashboard/announcements",
  ASSIGNMENT: "/dashboard/tugas",
  SUBMISSION: "/dashboard/tugas",
  MATERIAL: "/dashboard/materi",
  EVENT: "/dashboard/agenda",
  SCHEDULE: "/dashboard/schedules",
  // GALLERY sengaja tanpa pemetaan: moderator memakai PendingGalleryBadge,
  // sedangkan GALLERY untuk murid (hasil moderasi) jarang menumpuk.
};

export default function MenuUnreadBadge({
  type,
  suppress = false,
}: {
  /** Tipe notifikasi yang dihitung untuk item menu ini. */
  type: string;
  /** true = item menu ini memakai badge lain; jangan tampilkan. */
  suppress?: boolean;
}) {
  const byType = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (suppress) return null;

  const href = TYPE_TO_MENU[type];
  if (!href) return null;

  const count = byType[type] ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className="menu-unread-badge"
      aria-label={`${count} notifikasi belum dibaca`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
