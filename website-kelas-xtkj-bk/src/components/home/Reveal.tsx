"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Delay stagger dalam ms (0–400 disarankan) */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}

/**
 * Reveal saat elemen masuk viewport (sekali jalan) via IntersectionObserver.
 * Reduced-motion: CSS global sudah memaksa elemen langsung terlihat.
 * Elemen tetap di-DOM sejak render — konten tetap ada untuk SEO/screen reader,
 * hanya visibilitas yang ditunda sampai masuk viewport.
 */
export default function Reveal({ children, delay = 0, className, as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback tanpa IO: langsung tampil
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Cast ke "div" hanya untuk TypeScript — runtime tetap render tag `as`.
  const Tag = as as unknown as "div";
  return (
    <Tag
      ref={ref}
      className={`hx-reveal ${visible ? "hx-reveal--visible" : ""} ${className ?? ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
