"use client";

import { useCallback, useRef, useState } from "react";
import PhotoImg from "./PhotoImg";
import type { ViewerPhoto } from "./PhotoViewer";

interface GallerySliderProps {
  photos: ViewerPhoto[];
  onOpenViewer: (index: number) => void;
}

const SWIPE_THRESHOLD = 48;

/**
 * Class Gallery slider (Phase 13) — carousel sederhana:
 * - Track flex + transform (GPU-friendly), swipe/drag + tombol + dots.
 * - Drag memakai window listener (bukan setPointerCapture) agar click
 *   pada tombol slide tetap tertarget benar.
 * - Slide aktif eager; slide di luar jendela ±1 tidak memuat gambar.
 */
export default function GallerySlider({ photos, onOpenViewer }: GallerySliderProps) {
  const count = photos.length;
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  // Setelah swipe, cegah click-through membuka viewer
  const suppressClick = useRef(false);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (count < 2) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (count < 2 || !e.isPrimary) return;
      startX.current = e.clientX;
      setDragging(true);

      const move = (ev: PointerEvent) => {
        if (startX.current === null) return;
        setDx(ev.clientX - startX.current);
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (startX.current === null) return;
        const delta = ev.clientX - startX.current;
        startX.current = null;
        setDragging(false);
        setDx(0);
        if (Math.abs(delta) >= 8) suppressClick.current = true;
        if (Math.abs(delta) >= SWIPE_THRESHOLD) go(delta < 0 ? 1 : -1);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [count, go]
  );

  // Blokir klik yang terpicu oleh akhir drag/swipe
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  }, []);

  // Render jendela slide: aktif ±1 (hemat DOM & loading; sisanya polos)
  const windowed = new Set<number>();
  for (const off of [-1, 0, 1]) windowed.add((index + off + count) % count);

  return (
    <div
      className={`hx-gslider ${dragging ? "hx-gslider-dragging" : ""}`}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
    >
      <div className="hx-gslider-viewport">
        <div
          className="hx-gslider-track"
          style={{
            transform: `translate3d(calc(${-index * 100}% + ${dx}px), 0, 0)`,
          }}
        >
          {photos.map((p, i) => (
            <div key={p.id} className="hx-gslider-slide" aria-hidden={i !== index}>
              <button
                type="button"
                className="hx-gslider-open"
                onClick={() => (i === index ? onOpenViewer(i) : setIndex(i))}
                aria-label={`Buka foto: ${p.title}`}
              >
                <div className="hx-gslider-frame">
                  {windowed.has(i) ? (
                    <PhotoImg src={p.image} alt={p.title} eager={i === index} />
                  ) : (
                    <div className="hx-photo-broken" style={{ border: "none" }} aria-hidden="true" />
                  )}
                </div>
                <div className="hx-gslider-caption">
                  <p className="hx-gslider-title">{p.title}</p>
                  {p.description && <p className="hx-gslider-desc">{p.description}</p>}
                </div>
              </button>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              className="hx-btn-circle hx-btn-circle--overlay hx-gslider-nav hx-gslider-nav--prev"
              onClick={() => go(-1)}
              aria-label="Foto sebelumnya"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="hx-btn-circle hx-btn-circle--overlay hx-gslider-nav hx-gslider-nav--next"
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

      {count > 1 && (
        <div className="hx-gslider-footer">
          <span className="hx-gslider-count">
            {index + 1} / {count}
          </span>
          <div className="hx-dots" role="tablist" aria-label="Pilih foto">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={p.title}
                className={`hx-dot ${i === index ? "hx-dot--active" : ""}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
