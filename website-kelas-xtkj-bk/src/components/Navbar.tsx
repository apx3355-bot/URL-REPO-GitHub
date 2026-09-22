"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { BrandMark } from "@/components/Icons";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/struktur", label: "Struktur Kelas" },
  { href: "/anggota", label: "Anggota" },
  { href: "/galeri", label: "Galeri" },
  { href: "/tentang", label: "Tentang" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setLoggedIn(!!data?.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand" onClick={() => setOpen(false)}>
          <BrandMark size={32} />
          <span className="brand-text">
            X TKJ <span className="brand-bk">BK</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="desktop-nav" aria-label="Navigasi utama">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${
                (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))
                  ? "nav-link--active"
                  : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="navbar-actions">
          <ThemeToggle />
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="btn-login"
            tabIndex={0}
          >
            {loggedIn ? "Dashboard" : "Masuk"}
          </Link>
          <button
            className="mobile-toggle"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
          >
            <span className={`hamburger ${open ? "hamburger--open" : ""}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`mobile-menu ${open ? "mobile-menu--open" : ""}`}
        aria-hidden={!open}
      >
        <nav aria-label="Navigasi mobile">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-nav-link ${
                (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))
                  ? "mobile-nav-link--active"
                  : ""
              }`}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
            >
              {link.label}
            </Link>
          ))}
          <div className="mobile-menu-footer">
            <Link
              href={loggedIn ? "/dashboard" : "/login"}
              className="btn-login btn-login--mobile"
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
            >
              {loggedIn ? "Dashboard" : "Masuk"}
            </Link>
          </div>
        </nav>
      </div>

      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--color-navbar);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--color-border);
        }

        .navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          height: 56px;
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .brand-text {
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--color-text);
          text-transform: uppercase;
          white-space: nowrap;
        }

        .brand-bk {
          color: var(--color-accent);
        }

        .desktop-nav {
          display: none;
          align-items: center;
          gap: 0.25rem;
          flex: 1;
        }

        .nav-link {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-text-muted);
          border-radius: var(--radius-sm);
          transition: color 0.15s, background 0.15s;
          font-weight: 450;
        }

        .nav-link:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
        }

        .nav-link--active {
          color: var(--color-accent);
          font-weight: 550;
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-left: auto;
        }

        .btn-login {
          font-size: 0.8rem;
          font-weight: 550;
          padding: 0.375rem 0.875rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text);
          background: var(--color-surface);
          transition: border-color 0.15s, color 0.15s;
          display: inline-block;
          white-space: nowrap;
        }

        .btn-login:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .mobile-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background: transparent;
          transition: background 0.15s;
        }

        .mobile-toggle:hover {
          background: var(--color-surface-hover);
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 16px;
        }

        .hamburger span {
          display: block;
          width: 100%;
          height: 1.5px;
          background: var(--color-text);
          border-radius: 2px;
          transition: transform 0.2s, opacity 0.2s;
          transform-origin: center;
        }

        .hamburger--open span:nth-child(1) {
          transform: translateY(5.5px) rotate(45deg);
        }

        .hamburger--open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger--open span:nth-child(3) {
          transform: translateY(-5.5px) rotate(-45deg);
        }

        .mobile-menu {
          display: none;
          border-top: 1px solid var(--color-border);
          padding: 0.75rem 1.25rem 1rem;
          flex-direction: column;
          gap: 0.125rem;
          background: var(--color-background);
        }

        .mobile-menu--open {
          display: flex;
        }

        .mobile-nav-link {
          padding: 0.625rem 0.75rem;
          font-size: 0.9rem;
          color: var(--color-text-muted);
          border-radius: var(--radius-sm);
          font-weight: 450;
          transition: color 0.15s, background 0.15s;
        }

        .mobile-nav-link:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
        }

        .mobile-nav-link--active {
          color: var(--color-accent);
          font-weight: 550;
        }

        .mobile-menu-footer {
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border-light);
        }

        .btn-login--mobile {
          display: inline-block;
          width: auto;
        }

        @media (min-width: 768px) {
          .desktop-nav {
            display: flex;
          }

          .mobile-toggle {
            display: none;
          }

          .mobile-menu {
            display: none !important;
          }

          .navbar-inner {
            padding: 0 2rem;
          }
        }
      `}</style>
    </header>
  );
}
