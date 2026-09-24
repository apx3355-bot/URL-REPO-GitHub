"use client";

import { useEffect, useRef } from "react";

/**
 * Animated network background (Phase 14) — pengganti SVG statis di hero.
 *
 * - Node bergerak perlahan (kecepatan beda per node) dan saling terhubung
 *   garis yang mengikuti posisi node (opacity menurun sesuai jarak).
 * - Canvas 2D + rAF, transform-free (satu canvas = satu paint layer),
 *   DPR-aware (cap 2×), tanpa library eksternal.
 * - Adaptif device: jumlah node/connection menurun di layar kecil.
 * - Pause otomatis saat tab tersembunyi ATAU hero keluar viewport
 *   (IntersectionObserver) — tidak memakan CPU saat tidak terlihat.
 * - prefers-reduced-motion: gambar satu frame statis (identitas visual
 *   tetap ada), tanpa loop animasi.
 * - Warna diambil dari token --color-accent (mengikuti tema gelap/terang).
 * - Cleanup penuh: rAF, listener, observer dibuang saat unmount.
 */
export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    interface NetNode {
      nx: number; // posisi normalisasi 0..1
      ny: number;
      vx: number; // kecepatan normalisasi/detik (kecil, bervariasi)
      vy: number;
      phase: number; // fase pulse
      pulseSpeed: number;
      size: number;
    }

    let nodes: NetNode[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let running = false;
    let inView = true;
    let accent = { r: 6, g: 182, b: 212 };

    const readAccent = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent")
        .trim();
      const m = /^#([0-9a-f]{6})$/i.exec(raw);
      if (m) {
        const int = parseInt(m[1], 16);
        accent = { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
      }
    };

    const nodeCountFor = (width: number) =>
      width < 640 ? 16 : width < 1024 ? 24 : 34;

    const makeNodes = (n: number) => {
      nodes = Array.from({ length: n }, () => ({
        nx: Math.random(),
        ny: Math.random(),
        vx: (Math.random() * 2 - 1) * 0.022, // ≈ 8–22 px/detik pada hero 1000px
        vy: (Math.random() * 2 - 1) * 0.018,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.6 + Math.random() * 0.8,
        size: 1.6 + Math.random() * 1.6,
      }));
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Sesuaikan jumlah node dengan lebar terkini (mobile lebih ringan)
      const target = nodeCountFor(w);
      if (nodes.length !== target) makeNodes(target);
      draw(performance.now());
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // Grid digital sangat halus (identitas TKJ)
      ctx.strokeStyle = "rgba(148, 163, 184, 0.05)";
      ctx.lineWidth = 1;
      const gridStep = 90;
      ctx.beginPath();
      for (let x = gridStep; x < w; x += gridStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = gridStep; y < h; y += gridStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Posisi piksel node
      const px = nodes.map((n) => ({ x: n.nx * w, y: n.ny * h }));

      // Garis koneksi — jarak maksimum proporsional ukuran hero
      const maxDist = Math.min(w, 900) * 0.22;
      ctx.lineWidth = 1;
      for (let i = 0; i < px.length; i++) {
        for (let j = i + 1; j < px.length; j++) {
          const dx = px[i].x - px[j].x;
          const dy = px[i].y - px[j].y;
          const d = Math.hypot(dx, dy);
          if (d >= maxDist) continue;
          const alpha = 0.16 * (1 - d / maxDist);
          ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(px[i].x, px[i].y);
          ctx.lineTo(px[j].x, px[j].y);
          ctx.stroke();
        }
      }

      // Node: halo lembut + inti + pulse ringan
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.001 * n.pulseSpeed + n.phase);
        const x = px[i].x;
        const y = px[i].y;

        // Halo (glow murah: lingkaran besar ber-alpha rendah)
        ctx.fillStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${(0.05 + pulse * 0.04).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, n.size * 6, 0, Math.PI * 2);
        ctx.fill();

        // Inti
        ctx.fillStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${(0.55 + pulse * 0.25).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, n.size * (0.85 + pulse * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      if (!running) return;
      const dt = Math.min((t - last) / 1000, 0.05); // clamp dt (tab switch)
      last = t;

      for (const n of nodes) {
        n.nx += n.vx * dt;
        n.ny += n.vy * dt;
        // Memantul di tepi (gerak natural, tidak keluar area)
        if (n.nx < 0.02) { n.nx = 0.02; n.vx = Math.abs(n.vx); }
        if (n.nx > 0.98) { n.nx = 0.98; n.vx = -Math.abs(n.vx); }
        if (n.ny < 0.02) { n.ny = 0.02; n.vy = Math.abs(n.vy); }
        if (n.ny > 0.98) { n.ny = 0.98; n.vy = -Math.abs(n.vy); }
      }
      draw(t);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
    };
    const stop = () => {
      running = false;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (inView) start();
    };

    // Pause saat hero keluar viewport — hemat CPU saat scroll ke bawah
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        if (inView && !document.hidden) start();
        else stop();
      },
      { threshold: 0.02 }
    );
    io.observe(parent);

    // Ikuti perubahan tema (gelap/terang) untuk warna garis/node
    const themeObserver = new MutationObserver(readAccent);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    readAccent();
    resize();
    makeNodes(nodeCountFor(w));

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) {
      // Reduced motion: satu frame statis — identitas visual tetap, tanpa loop
      draw(performance.now());
    } else {
      raf = requestAnimationFrame((t) => {
        last = t;
        step(t);
      });
      start();
    }

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="hx-net-bg" aria-hidden="true" />;
}
