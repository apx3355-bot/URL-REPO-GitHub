"use client";

import { useState } from "react";

export default function DashboardNav() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="btn-logout"
      disabled={loading}
      aria-label="Keluar"
    >
      {loading ? "..." : "Keluar"}
      <style>{`
        .btn-logout {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.375rem 0.875rem;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 6px;
          color: white;
          background: transparent;
          transition: background 0.15s;
        }
        .btn-logout:hover:not(:disabled) {
          background: rgba(255,255,255,0.12);
        }
        .btn-logout:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </button>
  );
}
