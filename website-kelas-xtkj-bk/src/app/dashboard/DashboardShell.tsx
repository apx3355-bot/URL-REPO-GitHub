"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { BrandMark, MessageIcon, CalendarPlusIcon } from "@/components/Icons";
import AvatarDisplay from "@/components/AvatarDisplay";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutIcon,
  UsersIcon,
  SitemapIcon,
  MegaphoneIcon,
  CalendarIcon,
  ActivityIcon,
  UserIcon,
  SettingsIcon,
  ShieldIcon,
  BookIcon,
  ClipboardIcon,
} from "@/components/Icons";
import type { SessionUser } from "@/lib/session";
import PendingGalleryBadge from "@/components/PendingGalleryBadge";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { size?: number }) => ReactNode;
}

// Menu per role — sesuai spec Phase 6 §3.
// HANYA untuk UX; security tetap di server (middleware + requirePermission + layout guard).
const MENUS: Record<string, NavItem[]> = {
  DEVELOPER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutIcon },
    { href: "/dashboard/users", label: "User Management", icon: ShieldIcon },
    { href: "/dashboard/members", label: "Members", icon: UsersIcon },
    { href: "/dashboard/structure", label: "Struktur Kelas", icon: SitemapIcon },
    { href: "/dashboard/announcements", label: "Pengumuman", icon: MegaphoneIcon },
    { href: "/dashboard/materi", label: "Materi", icon: BookIcon },
    { href: "/dashboard/tugas", label: "Tugas", icon: ClipboardIcon },
    { href: "/dashboard/discussions", label: "Diskusi", icon: MessageIcon },
    { href: "/dashboard/agenda", label: "Agenda", icon: CalendarPlusIcon },
    { href: "/dashboard/schedules", label: "Jadwal", icon: CalendarIcon },
    { href: "/dashboard/gallery", label: "Galeri", icon: UserIcon },
    { href: "/dashboard/profile", label: "Profil", icon: UserIcon },
    { href: "/dashboard/activity", label: "Activity Log", icon: ActivityIcon },
    { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
  ],
  WALI_KELAS: [
    { href: "/", label: "Beranda", icon: LayoutIcon },
    { href: "/dashboard", label: "Dashboard", icon: LayoutIcon },
    { href: "/dashboard/members", label: "Anggota", icon: UsersIcon },
    { href: "/dashboard/structure", label: "Struktur Kelas", icon: SitemapIcon },
    { href: "/dashboard/announcements", label: "Pengumuman", icon: MegaphoneIcon },
    { href: "/dashboard/materi", label: "Materi", icon: BookIcon },
    { href: "/dashboard/tugas", label: "Tugas", icon: ClipboardIcon },
    { href: "/dashboard/discussions", label: "Diskusi", icon: MessageIcon },
    { href: "/dashboard/agenda", label: "Agenda", icon: CalendarPlusIcon },
    { href: "/dashboard/schedules", label: "Jadwal", icon: CalendarIcon },
    { href: "/dashboard/gallery", label: "Galeri", icon: UserIcon },
    { href: "/dashboard/profile", label: "Profil", icon: UserIcon },
    { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
  ],
  ANGGOTA: [
    { href: "/", label: "Beranda", icon: LayoutIcon },
    { href: "/dashboard", label: "Dashboard", icon: LayoutIcon },
    { href: "/dashboard/announcements", label: "Pengumuman", icon: MegaphoneIcon },
    { href: "/dashboard/materi", label: "Materi", icon: BookIcon },
    { href: "/dashboard/tugas", label: "Tugas", icon: ClipboardIcon },
    { href: "/dashboard/discussions", label: "Diskusi", icon: MessageIcon },
    { href: "/dashboard/agenda", label: "Agenda", icon: CalendarPlusIcon },
    { href: "/dashboard/schedules", label: "Jadwal", icon: CalendarIcon },
    { href: "/dashboard/structure", label: "Struktur Kelas", icon: SitemapIcon },
    { href: "/dashboard/gallery", label: "Galeri", icon: UserIcon },
    { href: "/dashboard/profile", label: "Profil", icon: UserIcon },
  ],
};

export default function DashboardShell({
  user,
  roleLabel,
  children,
}: {
  user: SessionUser;
  roleLabel: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menu = MENUS[user.role] ?? MENUS.ANGGOTA;

  // Kunci scroll body saat drawer mobile terbuka — cegah scroll-through
  // halaman di belakang drawer (Android).
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // replace agar tombol Back tidak membuka halaman dashboard dari cache
      window.location.replace("/login?loggedOut=1");
    }
  }

  // Root "/" & "/dashboard" exact-match — tanpa ini "Beranda" ikut aktif
  // di SEMUA halaman (startsWith("/") selalu true) dan indikator drawer ganda.
  const isActive = (href: string) =>
    href === "/" || href === "/dashboard"
      ? pathname === href
      : pathname.startsWith(href);

  // Sidebar bersama desktop & drawer mobile. Desktop: brand di atas.
  // Mobile: header identitas user (foto, nama, role) + tombol tutup.
  const renderSidebar = (opts?: { mobile?: boolean }) => {
    const mobile = !!opts?.mobile;
    return (
    <nav className="sidebar-nav" aria-label="Navigasi dashboard">
      {mobile ? (
        <div className="sidebar-user">
          <AvatarDisplay name={user.fullName} photo={user.photo} size="md" />
          <div className="sidebar-user-id">
            <span className="sidebar-user-name">{user.fullName}</span>
            <span className={`topbar-role topbar-role--${user.role.toLowerCase()}`}>
              {roleLabel}
            </span>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="sidebar-brand">
          <BrandMark size={30} />
          <span className="sidebar-brand-text">X TKJ BK</span>
        </div>
      )}
      <ul className="sidebar-menu">
        {menu.map((item) => {
          const Icon = item.icon;
          const showPending =
            (item.href === "/dashboard/gallery" && user.role !== "ANGGOTA");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`sidebar-link ${isActive(item.href) ? "sidebar-link--active" : ""}`}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <Icon size={15} />
                {item.label}
                {showPending && <PendingGalleryBadge />}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="sidebar-footer">
        <ThemeToggle variant="sidebar" />
        <button
          className="sidebar-logout"
          onClick={() => setConfirmLogout(true)}
          disabled={loggingOut}
        >
          Keluar
        </button>
      </div>
    </nav>
    );
  };

  return (
    <div className="shell">
      {/* Overlay dropdown akun — di luar .topbar karena backdrop-filter
          menjadikan topbar containing-block bagi position:fixed */}
      {userMenuOpen && (
        <div className="user-menu-overlay" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar desktop */}
      <aside className="sidebar">{renderSidebar()}</aside>

      {/* Drawer mobile */}
      {sidebarOpen && (
        <div className="drawer-overlay" onClick={() => setSidebarOpen(false)}>
          <aside
            id="mobile-drawer"
            className="sidebar sidebar--mobile"
            onClick={(e) => e.stopPropagation()}
            aria-label="Menu dashboard"
          >
            {renderSidebar({ mobile: true })}
          </aside>
        </div>
      )}

      <div className="shell-main">
        <header className="topbar">
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-drawer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="topbar-actions">
            <NotificationBell />
          </div>
          <div className="topbar-user">
            <button
              className="topbar-user-btn"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              onKeyDown={(e) => {
                if (e.key === "Escape") setUserMenuOpen(false);
              }}
            >
              <AvatarDisplay name={user.fullName} photo={user.photo} size="sm" />
              <span className="topbar-name">{user.fullName}</span>
              <span className={`topbar-role topbar-role--${user.role.toLowerCase()}`}>
                {roleLabel}
              </span>
            </button>
            {userMenuOpen && (
              <div className="user-menu" role="menu" aria-label="Menu akun">
                <div className="user-menu-header">
                  <AvatarDisplay name={user.fullName} photo={user.photo} size="md" />
                  <div className="user-menu-id">
                    <span className="user-menu-name">{user.fullName}</span>
                    <span className="user-menu-username">@{user.username}</span>
                  </div>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="user-menu-item"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <UserIcon size={14} /> Profil Saya
                </Link>
                <button
                  className="user-menu-item user-menu-item--danger"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setConfirmLogout(true);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Keluar
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="shell-content" id="main-content">
          {children}
        </main>
      </div>

      {/* Konfirmasi logout */}
      {confirmLogout && (
        <div className="drawer-overlay" role="dialog" aria-modal="true" aria-label="Konfirmasi keluar">
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="logout-modal-title">Keluar dari akun?</h2>
            <p className="logout-modal-text">
              Sesi Anda akan diakhiri. Data akun tetap aman — Anda bisa login kembali kapan saja.
            </p>
            <div className="logout-modal-actions">
              <button
                className="logout-modal-btn logout-modal-btn--cancel"
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
              >
                Batal
              </button>
              <button
                className="logout-modal-btn logout-modal-btn--confirm"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Mengakhiri sesi..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .shell {
          min-height: 100vh;
          display: flex;
          background: var(--color-background);
        }

        /* SIDEBAR */
        .sidebar {
          width: 232px;
          flex-shrink: 0;
          background: var(--color-brand);
          border-right: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1rem 0.75rem;
          overflow-y: auto;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem 1.25rem;
        }

        .sidebar-brand-text {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--color-on-brand);
          text-transform: uppercase;
        }

        .sidebar-menu {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          flex: 1;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          color: rgba(248,250,252,0.65);
          transition: background 0.15s, color 0.15s;
        }

        .sidebar-link:hover {
          background: rgba(248,250,252,0.06);
          color: var(--color-on-brand);
        }

        .sidebar-link--active {
          background: var(--color-accent-soft);
          color: var(--color-accent);
        }

        /* Badge jumlah foto menunggu moderasi — MAINTENANCE notifikasi galeri */
        .sidebar-link {
          position: relative;
        }
        .gallery-pending-badge {
          margin-left: auto;
          min-width: 1.25rem;
          height: 1.25rem;
          padding: 0 0.375rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6875rem;
          font-weight: 700;
          background: var(--color-accent);
          color: #050b14;
          line-height: 1;
        }
        .gallery-pending-badge--hidden {
          display: none;
        }

        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(248,250,252,0.08);
        }

        .sidebar-logout {
          font-size: 0.78rem;
          font-weight: 550;
          padding: 0.4375rem 0.75rem;
          border: 1px solid rgba(248,250,252,0.15);
          border-radius: var(--radius-sm);
          color: rgba(248,250,252,0.75);
          background: transparent;
          transition: background 0.15s, color 0.15s;
        }

        .sidebar-logout:hover {
          background: var(--color-danger-soft);
          color: var(--color-danger);
          border-color: var(--color-danger);
        }

        /* MAIN */
        .shell-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1rem;
          height: 52px;
          padding: 0 1.25rem;
          background: var(--color-navbar);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--color-border);
        }

        .topbar-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px; /* target sentuh Android */
          height: 40px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          margin-right: auto;
        }

        .topbar-menu-btn:hover {
          color: var(--color-accent);
          border-color: var(--color-accent);
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-left: auto;
        }

        .topbar-user {
          margin-left: 0;
        }

        .topbar-user {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          min-width: 0;
        }

        .topbar-user-btn {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          min-width: 0;
          padding: 0.25rem 0.375rem;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }

        .topbar-user-btn:hover,
        .topbar-user-btn[aria-expanded="true"] {
          border-color: var(--color-border);
          background: rgba(148,163,184,0.06);
        }

        .user-menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 80; /* di bawah topbar (90) agar dropdown tetap klikable, di atas konten */
        }

        .user-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          z-index: 160;
          width: 230px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.45));
          padding: 0.5rem;
          animation: userMenuIn 0.15s ease;
        }

        @keyframes userMenuIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .user-menu-header {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.5rem 0.75rem;
          border-bottom: 1px solid var(--color-border-light);
          margin-bottom: 0.375rem;
        }

        .user-menu-id {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .user-menu-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-menu-username {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--color-text-subtle);
        }

        .user-menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.625rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--color-text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s, color 0.15s;
        }

        .user-menu-item:hover {
          background: rgba(148,163,184,0.08);
          color: var(--color-text);
        }

        .user-menu-item--danger:hover {
          background: var(--color-danger-soft);
          color: var(--color-danger);
        }

        .topbar-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .topbar-role {
          font-size: 0.62rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          padding: 0.1875rem 0.5rem;
          border-radius: 999px;
          white-space: nowrap;
        }

        .topbar-role--developer { background: var(--color-accent-soft); color: var(--color-accent); }
        .topbar-role--wali_kelas { background: var(--color-warning-soft); color: var(--color-warning); }
        .topbar-role--anggota { background: var(--color-success-soft); color: var(--color-success); }

        .shell-content {
          flex: 1;
          padding: 1.75rem 1.25rem 3.5rem;
          max-width: 1160px;
          width: 100%;
          margin: 0 auto;
        }

        /* Mobile drawer */
        .drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 200;
          /* fade ringan; jika timeline macet, overlay tetap ada & bisa diklik */
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
        }

        .sidebar--mobile {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 201;
          /* KRITIS 1: rule .sidebar di atas men-set display:none di <900px
             (menyembunyikan sidebar desktop), drawer harus di-re-enable —
             tanpa ini panel drawer muncul "kosong" di Android */
          display: flex;
          /* KRITIS 2: panel TIDAK dianimasikan translate — drawer yang
             tergantung animasi selesai untuk terlihat rapuh (timeline
             bisa tertunda di renderer lambat). Panel muncul instan,
             animasi ringan hanya fade overlay di bawah. */
          width: min(280px, 82vw);
          border-right: 1px solid var(--color-border);
          box-shadow: var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.45));
        }

        @media (prefers-reduced-motion: reduce) {
          .drawer-overlay {
            animation: none;
          }
        }

        /* Header identitas user di drawer mobile (foto + nama + role + close) */
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.25rem 0.25rem 1rem;
          border-bottom: 1px solid rgba(248,250,252,0.1);
          margin-bottom: 0.75rem;
        }

        .sidebar-user-id {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
          flex: 1;
        }

        .sidebar-user-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-on-brand);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border: 1px solid rgba(248,250,252,0.15);
          border-radius: var(--radius-sm);
          background: transparent;
          color: rgba(248,250,252,0.75);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }

        .sidebar-close:hover {
          background: rgba(248,250,252,0.08);
          color: var(--color-on-brand);
        }

        @media (min-width: 900px) {
          .topbar-menu-btn {
            display: none;
          }

          .shell-content {
            padding: 2rem 2rem 4rem;
          }
        }

        @media (max-width: 899px) {
          .sidebar {
            display: none;
          }

          /* Drawer mobile tetap tampil — rule ini HARUS datang setelah
             .sidebar di atas (specificity sama, urutan menang) */
          .sidebar--mobile {
            display: flex;
          }

          /* Item menu enak disentuh di Android (min 44px) */
          .sidebar-link {
            min-height: 44px;
            font-size: 0.875rem;
          }

          .sidebar-logout {
            min-height: 44px;
          }

          /* Ruang aman gesture bar iPhone + notch Android */
          .sidebar--mobile .sidebar-nav {
            padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
          }
        }

        @media (max-width: 480px) {
          .topbar-name {
            display: none;
          }

          .user-menu {
            width: min(260px, calc(100vw - 1.5rem));
          }
        }

        /* LOGOUT MODAL */
        .logout-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 210;
          width: min(360px, calc(100vw - 2rem));
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          box-shadow: var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.45));
          animation: modalIn 0.15s ease;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }

        .logout-modal-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .logout-modal-text {
          font-size: 0.82rem;
          color: var(--color-text-muted);
          line-height: 1.5;
          margin-bottom: 1.25rem;
        }

        .logout-modal-actions {
          display: flex;
          gap: 0.625rem;
          justify-content: flex-end;
        }

        .logout-modal-btn {
          font-size: 0.82rem;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          transition: opacity 0.15s, background 0.15s;
        }

        .logout-modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .logout-modal-btn--cancel {
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          background: transparent;
        }

        .logout-modal-btn--confirm {
          background: var(--color-danger);
          color: #fff;
          border: 1px solid var(--color-danger);
        }

        .logout-modal-btn--confirm:hover:not(:disabled) {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
