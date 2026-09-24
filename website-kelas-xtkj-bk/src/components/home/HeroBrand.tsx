"use client";

import { useCallback, useRef } from "react";

/**
 * Hero brand animasi:
 * - Entrance: CSS hx-enter + hx-hero-logo/ring (fade-up, ring scale-in)
 * - Idle: hx-float (logo bob) + hx-ring-breathe (ring) — murni CSS
 * - Interaksi: parallax cursor (desktop, pointer:fine) & tilt sentuh
 *   (mobile) — hanya transform via CSS var, tanpa re-render React.
 * - Reduced motion: CSS global menonaktifkan semua gerak; JS juga skip.
 */
export default function HeroBrand() {
  const rootRef = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    // Normalisasi -1..1 dari pusat elemen
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    el.style.setProperty("--hx-px", String(Math.max(-1, Math.min(1, px))));
    el.style.setProperty("--hx-py", String(Math.max(-1, Math.min(1, py))));
  }, []);

  const onPointerLeave = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--hx-px", "0");
    el.style.setProperty("--hx-py", "0");
  }, []);

  const onTouchStart = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Respons sentuh ringan: "angkat" sedikit + hidupkan glow
    el.style.setProperty("--hx-px", "0.5");
    el.style.setProperty("--hx-py", "-0.5");
    el.style.setProperty("--hx-glow", "1");
  }, []);

  const onTouchEnd = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--hx-px", "0");
    el.style.setProperty("--hx-py", "0");
    el.style.setProperty("--hx-glow", "0");
  }, []);

  return (
    <div
      ref={rootRef}
      className="hx-hero-brand"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      aria-hidden="true"
    >
      {/* Cincin dekoratif bernafas */}
      <span className="hx-hero-ring hx-hero-ring--a" />
      <span className="hx-hero-ring hx-hero-ring--b" />
      <span className="hx-hero-logo">
        <BrandMarkInner />
      </span>
    </div>
  );
}

function BrandMarkInner() {
  return (
    <span
      style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(6, 182, 212, calc(0.18 + var(--hx-glow, 0) * 0.22))",
        transition: "box-shadow 0.3s",
      }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {/* Node network mark — identitas jaringan (sama dengan BrandMark) */}
        <circle cx="5" cy="6" r="2" />
        <circle cx="19" cy="6" r="2" />
        <circle cx="12" cy="18" r="2" />
        <path d="M6.5 7.5 10.5 16M17.5 7.5 13.5 16M7 6h10" />
      </svg>
    </span>
  );
}
