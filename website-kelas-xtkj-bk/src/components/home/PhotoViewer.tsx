"use client";

import { useCallback, useEffect, useRef } from "react";
import PhotoImg from "./PhotoImg";

export interface ViewerPhoto {
  id: number;
  title: string;
  image: string;
  date?: string;
  description?: string;
}

interface PhotoViewerProps {
  photos: ViewerPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const SWIPE_THRESHOLD = 50;

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Photo viewer modal (Phase 13):
 * - Foto besar + caption; close via tombol, Escape, klik area luar.
 * - next/prev via tombol overlay, keyboard Arrow, dan swipe (touch).
 * - TIDAK menyentuh browser history (bukan route; tidak ada pushState).
 * - Scroll body dikunci saat terbuka dan dikembalikan saat tutup.
 * - Fokus dikembalikan ke elemen pemicu saat menutup (a11y).
 */
export default function PhotoViewer({ photos, index, onClose, onIndexChange }: PhotoViewerProps) {
  const count = photos.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (count < 2) return;
      onIndexChange((index + dir + count) % count);
    },
    [count, index, onIndexChange]
  );

  // Keyboard global saat viewer terbuka
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        go(1);
      } else if (e.key === "ArrowLeft") {
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Kunci scroll body saat terbuka; restore nilai lama saat tutup
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Simpan & kembalikan fokus ke elemen pemicu (a11y)
  const restoreRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    return () => {
      restoreRef.current?.focus?.();
    };
  }, []);

  // ---- Swipe (touch) ----
  const startX = useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? null;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? 0) - startX.current;
      startX.current = null;
      if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
    },
    [go]
  );

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      className="hx-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto: ${photo.title}`}
      onClick={onClose}
    >
      <div className="hx-viewer-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="hx-btn-circle hx-btn-circle--overlay hx-viewer-close"
          onClick={onClose}
          aria-label="Tutup viewer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="hx-viewer-imgwrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <PhotoImg src={photo.image} alt={photo.title} eager />
          {count > 1 && (
            <>
              <button
                type="button"
                className="hx-btn-circle hx-btn-circle--overlay hx-viewer-nav hx-viewer-nav--prev"
                onClick={() => go(-1)}
                aria-label="Foto sebelumnya"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="hx-btn-circle hx-btn-circle--overlay hx-viewer-nav hx-viewer-nav--next"
                onClick={() => go(1)}
                aria-label="Foto berikutnya"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </div>

        <div className="hx-viewer-meta">
          <p className="hx-viewer-title">{photo.title}</p>
          <p className="hx-viewer-sub">
            {photo.date && <span>{formatDate(photo.date)}</span>}
            {photo.description && <span>{photo.description}</span>}
            {count > 1 && (
              <span>
                {index + 1} / {count}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
