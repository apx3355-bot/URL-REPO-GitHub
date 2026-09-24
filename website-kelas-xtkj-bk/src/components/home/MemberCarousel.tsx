"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AvatarDisplay from "@/components/AvatarDisplay";
import type { ClassMember } from "@/types";

const SWIPE_THRESHOLD = 48;
const AUTO_INTERVAL = 5000; // auto-slide tiap 5 detik
const RESUME_DELAY = 9000; // lanjut otomatis 9 detik setelah interaksi terakhir

/**
 * Member carousel (Phase 14) — upgrade dari stacked slider Phase 13:
 * - Desktop: hingga 5 kartu terlihat, kartu AKTIF di tengah dengan frame
 *   hijau (--color-success) + glow ringan; tetangga scale/opacity lebih
 *   rendah (depth ringan), tetap terlihat (tidak menghilang tiba-tiba).
 * - Auto sliding dengan pause saat interaksi (hover/touch/focus/keyboard),
 *   resume otomatis beberapa detik kemudian, berhenti saat tab tersembunyi.
 * - Kontrol manual: tombol prev/next, dots, swipe/drag, keyboard (stage fokus).
 * - Loop (infinite) saat anggota > 5 via offset modular — tanpa duplikasi
 *   kartu yang aneh (offset dihitung, bukan kartu dikloning).
 * - Data: ClassMember asli dari DB (page). Tidak ada profil palsu.
 *   Jumlah kartu otomatis mengikuti jumlah anggota (< 5 tetap rapi).
 * - Aksesibilitas: role=carousel, dots = tab, aria-live counter, keyboard,
 *   prefers-reduced-motion mematikan auto-slide & transisi (fungsi tetap).
 */
export default function MemberCarousel({ members }: { members: ClassMember[] }) {
  const count = members.length;
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [step, setStep] = useState(240); // fallback; disinkronkan dgn CSS saat mount
  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const dragRef = useRef(false);
  const holdRef = useRef(0); // timestamp — jangan auto-slide sebelum waktu ini
  const suppressClick = useRef(false);

  // Sinkronkan step dgn --hx-mc-step CSS (agar fallback inline selalu benar)
  useEffect(() => {
    const track = stageRef.current?.querySelector<HTMLElement>(".hx-mc-track");
    if (!track) return;
    const sync = () => {
      const raw = getComputedStyle(track).getPropertyValue("--hx-mc-step").trim();
      const px = parseFloat(raw);
      if (Number.isFinite(px) && px > 0) setStep(px);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  // prefers-reduced-motion: matikan auto-slide (transisi via CSS global)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Tahan auto-slide selama ms
  const hold = useCallback((ms: number) => {
    holdRef.current = Date.now() + ms;
  }, []);

  const go = useCallback(
    (dir: 1 | -1, manual = false) => {
      if (count < 2) return;
      if (manual) hold(RESUME_DELAY);
      setIndex((i) => (i + dir + count) % count);
    },
    [count, hold]
  );

  // Auto-slide loop — satu interval, kondisi dicek per-tick via refs
  useEffect(() => {
    if (count < 2 || reduced) return;
    const tick = () => {
      if (dragRef.current || document.hidden) return;
      if (Date.now() < holdRef.current) return;
      setIndex((i) => (i + 1) % count);
    };
    const id = window.setInterval(tick, AUTO_INTERVAL);
    // Setelah tab kembali terlihat, beri jeda sebelum lanjut
    const onVisible = () => {
      if (!document.hidden) hold(2500);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [count, reduced, hold]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1, true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1, true);
      }
    },
    [go]
  );

  // ---- Pointer drag (mouse + touch) — window listeners tanpa capture
  // agar klik pada Link kartu aktif tetap tertarget benar (pelajaran Phase 13).
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (count < 2 || !e.isPrimary) return;
      startRef.current = e.clientX;
      dragRef.current = true;
      hold(RESUME_DELAY);

      const move = (ev: PointerEvent) => {
        if (startRef.current === null) return;
        const dx = ev.clientX - startRef.current;
        const stage = stageRef.current;
        if (stage) stage.style.setProperty("--hx-mc-shift", `${dx}px`);
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (startRef.current === null) return;
        const dx = ev.clientX - startRef.current;
        startRef.current = null;
        dragRef.current = false;
        const stage = stageRef.current;
        if (stage) stage.style.setProperty("--hx-mc-shift", "0px");
        hold(RESUME_DELAY);
        if (Math.abs(dx) >= 8) suppressClick.current = true;
        if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [count, go, hold]
  );

  // Hover desktop = pause; keluar area = resume beberapa detik kemudian.
  // Dipasang sebagai listener NATIVE via ref — mouseenter/mouseleave adalah
  // event non-bubbling, paling andal di level elemen (dan bisa diuji langsung).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const enter = () => hold(3_600_000);
    const leave = () => hold(2000);
    const focusIn = () => hold(RESUME_DELAY);
    stage.addEventListener("mouseenter", enter);
    stage.addEventListener("mouseleave", leave);
    stage.addEventListener("focusin", focusIn);
    return () => {
      stage.removeEventListener("mouseenter", enter);
      stage.removeEventListener("mouseleave", leave);
      stage.removeEventListener("focusin", focusIn);
    };
  }, [hold]);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  }, []);

  if (count === 0) return null;

  // Offset tiap kartu relatif kartu aktif. > 5 anggota → wrap modular
  // (infinite loop, tanpa kartu duplikat); <= 5 → tampilkan apa adanya.
  const relOf = (i: number) => {
    let rel = i - index;
    if (count > 5) {
      if (rel > count / 2) rel -= count;
      else if (rel < -count / 2) rel += count;
    }
    return rel;
  };

  return (
    <div>
      <div
        ref={stageRef}
        className="hx-mc-stage"
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
        tabIndex={count > 1 ? 0 : -1}
        role={count > 1 ? "group" : undefined}
        aria-roledescription="carousel"
        aria-label={`Anggota kelas, kartu ${index + 1} dari ${count}`}
      >
        <div className="hx-mc-track" aria-live="polite">
          {members.map((member, i) => {
            const rel = relOf(i);
            if (Math.abs(rel) > 2) return null; // hanya aktif + 2 kiri/kanan
            const isMain = rel === 0;
            const far = Math.abs(rel) > 1;
            const style: React.CSSProperties = {
              "--rel": String(rel),
              zIndex: 10 - Math.abs(rel),
              transform: `translate3d(calc(-50% + ${rel} * ${step}px + var(--hx-mc-shift, 0px)), -50%, 0) scale(${isMain ? 1 : far ? 0.88 : 0.94})`,
              opacity: far ? 0.72 : 1,
            } as React.CSSProperties;

            const card = (
              <>
                <AvatarDisplay name={member.name} photo={member.photo} size="xl" />
                <p className="hx-mc-name">{member.name}</p>
                {member.position ? (
                  <p className="hx-mc-position">{member.position}</p>
                ) : (
                  <p className="hx-mc-position hx-mc-position--plain">Anggota Kelas</p>
                )}
                {isMain && count > 1 && (
                  <p className="hx-mc-hint" aria-hidden="true">
                    Geser / panah untuk berpindah ↔
                  </p>
                )}
              </>
            );

            return isMain && count > 1 ? (
              <Link
                key={member.id}
                href="/anggota"
                className="hx-mc-card hx-mc-card--active"
                style={style}
                aria-label={`Profil ${member.name}${member.position ? ` — ${member.position}` : ""} — lihat semua anggota`}
                draggable={false}
              >
                {card}
              </Link>
            ) : (
              <div
                key={`${member.id}-${i}`}
                className="hx-mc-card"
                style={style}
                aria-hidden={!isMain}
              >
                {card}
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <div className="hx-mc-controls">
          <button
            type="button"
            className="hx-btn-circle"
            onClick={() => go(-1, true)}
            aria-label="Anggota sebelumnya"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="hx-dots" role="tablist" aria-label="Posisi kartu anggota">
            {members.map((m, i) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1}. ${m.name}`}
                className={`hx-dot ${i === index ? "hx-dot--active" : ""}`}
                onClick={() => {
                  hold(RESUME_DELAY);
                  setIndex(i);
                }}
              />
            ))}
          </div>

          <button
            type="button"
            className="hx-btn-circle"
            onClick={() => go(1, true)}
            aria-label="Anggota berikutnya"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {count > 1 && (
        <p className="hx-mc-count" aria-live="polite">
          {index + 1} / {count} · {members[index].name}
          {!reduced && <span className="hx-mc-auto"> · putar otomatis</span>}
        </p>
      )}
    </div>
  );
}
