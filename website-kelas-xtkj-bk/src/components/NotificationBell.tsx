"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/Icons";

interface Notification {
  id: number;
  type: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT: "Pengumuman",
  DISCUSSION_REPLY: "Diskusi",
  EVENT: "Agenda",
  GALLERY: "Galeri",
};

// Polling 60 detik — cukup untuk in-app notif kelas tanpa beban server.
const POLL_MS = 60_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // polling best-effort; biarkan state lama
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markRead(id: number) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  function openLink(n: Notification) {
    if (!n.isRead) markRead(n.id);
    if (n.link) {
      setOpen(false);
      window.location.href = n.link;
    }
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        className="notif-btn"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-label={`Notifikasi${unread > 0 ? `, ${unread} belum dibaca` : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <BellIcon size={16} />
        {unread > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-menu" role="menu" aria-label="Daftar notifikasi">
          <div className="notif-menu-head">
            <span className="notif-menu-title">Notifikasi</span>
            {unread > 0 && (
              <button className="notif-markall" onClick={markAllRead}>
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading && items.length === 0 ? (
              <p className="notif-empty">Memuat...</p>
            ) : items.length === 0 ? (
              <p className="notif-empty">
                <BellIcon size={18} />
                Belum ada notifikasi.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  className={`notif-item ${n.isRead ? "" : "notif-item--unread"}`}
                  onClick={() => openLink(n)}
                  role="menuitem"
                >
                  <span className="notif-dot" aria-hidden="true" />
                  <span className="notif-body">
                    <span className="notif-meta">
                      <span className="notif-type">{TYPE_LABELS[n.type] ?? n.type}</span>
                      <time className="notif-time">
                        {new Date(n.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </span>
                    <span className="notif-msg">{n.message}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notif-wrap {
          position: relative;
        }

        .notif-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .notif-btn:hover,
        .notif-btn[aria-expanded="true"] {
          color: var(--color-accent);
          border-color: var(--color-accent);
        }

        .notif-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 700;
          border-radius: 999px;
          background: var(--color-danger);
          color: #fff;
        }

        .notif-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          z-index: 160;
          width: min(330px, calc(100vw - 2rem));
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.45));
          animation: notifIn 0.15s ease;
          overflow: hidden;
        }

        @keyframes notifIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .notif-menu-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.875rem;
          border-bottom: 1px solid var(--color-border-light);
        }

        .notif-menu-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .notif-markall {
          font-size: 0.7rem;
          color: var(--color-accent);
          background: none;
          border: none;
          cursor: pointer;
        }

        .notif-markall:hover {
          text-decoration: underline;
        }

        .notif-list {
          max-height: 340px;
          overflow-y: auto;
        }

        .notif-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          padding: 1.5rem 1rem;
          font-size: 0.78rem;
          color: var(--color-text-subtle);
        }

        .notif-item {
          display: flex;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border-light);
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }

        .notif-item:last-child {
          border-bottom: none;
        }

        .notif-item:hover {
          background: rgba(148,163,184,0.07);
        }

        .notif-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: transparent;
          margin-top: 6px;
          flex-shrink: 0;
        }

        .notif-item--unread .notif-dot {
          background: var(--color-accent);
        }

        .notif-body {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }

        .notif-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .notif-type {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-accent);
        }

        .notif-time {
          font-size: 0.65rem;
          color: var(--color-text-subtle);
          white-space: nowrap;
        }

        .notif-msg {
          font-size: 0.78rem;
          color: var(--color-text);
          line-height: 1.4;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .notif-item:not(.notif-item--unread) .notif-msg {
          color: var(--color-text-muted);
        }

        @media (max-width: 480px) {
          .notif-menu {
            position: fixed;
            top: 56px;
            left: 0.5rem;
            right: 0.5rem;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}
