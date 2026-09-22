"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ variant = "navbar" }: { variant?: "navbar" | "sidebar" }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage tidak tersedia — abaikan
    }
  }

  return (
    <button
      className={`theme-toggle ${variant === "sidebar" ? "theme-toggle--sidebar" : ""}`}
      onClick={toggle}
      aria-label={theme === "dark" ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      title={theme === "dark" ? "Tema terang" : "Tema gelap"}
      suppressHydrationWarning
    >
      {mounted && theme === "light" ? (
        // Ikon moon (sedang light, klik untuk dark)
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Ikon sun (sedang dark, klik untuk light)
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}

      <style>{`
        .theme-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-muted);
          transition: color 0.15s, border-color 0.15s, background 0.15s;
        }
        .theme-toggle:hover {
          color: var(--color-accent);
          border-color: var(--color-accent);
        }
        .theme-toggle--sidebar {
          width: 100%;
          height: 34px;
          gap: 0.5rem;
          font-size: 0.8rem;
          justify-content: flex-start;
          padding: 0 0.75rem;
        }
      `}</style>
    </button>
  );
}
