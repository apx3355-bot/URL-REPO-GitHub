"use client";

// Badge jumlah foto galeri menunggu moderasi (PENDING) untuk sidebar dashboard
// Developer & Wali Kelas. MAINTENANCE — notifikasi/indikator moderasi galeri.
//
// - Data dari /api/gallery/moderation existing (sudah guard permission
//   gallery:moderate di server — murid/anon otomatis 403, badge tetap tersembunyi).
// - Polling 60 detik, hanya saat tab aktif (visibilitychange) — ringan.
// - Tanpa badge saat 0 (tidak ada kebisingan visual).

import { useCallback, useEffect, useState } from "react";

const POLL_MS = 60_000;

export default function PendingGalleryBadge() {
  const [count, setCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      // Endpoint count ringan (1 query agregat, tanpa payload gambar) —
      // bukan /moderation yang menarik seluruh baris tiap polling.
      const res = await fetch("/api/gallery/pending-count");
      if (!res.ok) {
        setCount(null);
        return;
      }
      const data = await res.json();
      setCount(typeof data.count === "number" ? data.count : null);
    } catch {
      // best-effort; biarkan nilai lama
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (count === null || count === 0) return null;

  return (
    <span
      className="gallery-pending-badge"
      aria-label={`${count} foto menunggu moderasi`}
      title={`${count} foto menunggu moderasi`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
