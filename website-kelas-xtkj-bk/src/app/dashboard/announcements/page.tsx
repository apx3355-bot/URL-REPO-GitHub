"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashCSS, formatDateTime } from "@/components/dashboard/SharedUI";
import { SearchIcon, PinIcon } from "@/components/Icons";

interface Announcement {
  id: number;
  title: string;
  content: string;
  status: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: { username: string; profile: { fullName: string } | null } | null;
}

interface Me {
  role: "DEVELOPER" | "WALI_KELAS" | "ANGGOTA";
  username: string;
}

const emptyForm = { title: "", content: "", status: "PUBLISHED" };

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const [annRes, meRes] = await Promise.all([
        fetch(`/api/announcements?all=1${query ? `&q=${encodeURIComponent(query)}` : ""}`),
        fetch("/api/auth/me"),
      ]);
      if (annRes.ok) {
        const data = await annRes.json();
        setItems(data.announcements);
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setMe(data.user);
      }
    } catch {
      setError("Tidak dapat memuat data. Periksa koneksi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canCreate = me?.role === "DEVELOPER" || me?.role === "WALI_KELAS";
  const canDelete = me?.role === "DEVELOPER";

  function onSearchChange(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 300);
  }

  async function handlePin(a: Announcement) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/announcements/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !a.pinned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal mengubah pin.");
        return;
      }
      setSuccess(a.pinned ? "Pengumuman dilepas dari pin." : "Pengumuman disematkan di atas feed.");
      load(q);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({ title: a.title, content: a.content, status: a.status });
    setFieldErrors({});
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const url = editing ? `/api/announcements/${editing.id}` : "/api/announcements";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setError(data.error || "Gagal menyimpan.");
        return;
      }
      setSuccess(editing ? "Pengumuman berhasil diubah." : "Pengumuman berhasil dibuat.");
      setShowModal(false);
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus pengumuman ini? Tindakan tidak dapat dibatalkan.")) return;
    setDeleting(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menghapus.");
        return;
      }
      setSuccess("Pengumuman berhasil dihapus.");
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="dash-page-title">Pengumuman</h1>
          <p className="dash-page-desc">Kelola pengumuman kelas.</p>
        </div>
        <div className="ann-toolbar">
          <div className="ann-search">
            <SearchIcon size={14} />
            <input
              className="ann-search-input"
              placeholder="Cari pengumuman..."
              value={q}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Cari pengumuman"
            />
          </div>
          {canCreate && (
            <button className="dash-btn" onClick={openCreate}>+ Pengumuman Baru</button>
          )}
        </div>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="dash-empty">{q ? `Tidak ada hasil untuk "${q}".` : "Belum ada pengumuman."}</div>
      ) : (
        <div className="dash-list">
          {items.map((a) => {
            const canEdit = me?.role === "DEVELOPER" || (me?.role === "WALI_KELAS" && a.author?.username === me.username);
            return (
              <div key={a.id} className="dash-item" style={{ background: "var(--color-surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      {a.pinned && (
                        <span className="ann-pin" title="Disematkan">
                          <PinIcon size={12} /> PINNED
                        </span>
                      )}
                      <span className="dash-item-title">{a.title}</span>
                      <span className={`dash-status dash-status--${a.status.toLowerCase()}`}>{a.status}</span>
                    </div>
                    <div className="dash-item-desc">{a.content}</div>
                    <div className="dash-item-meta">
                      {a.author?.profile?.fullName ?? a.author?.username ?? "—"} · {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0, alignItems: "flex-start" }}>
                    {canEdit && (
                      <button
                        className={`ann-pin-btn ${a.pinned ? "ann-pin-btn--active" : ""}`}
                        onClick={() => handlePin(a)}
                        title={a.pinned ? "Lepas pin" : "Sematkan di atas"}
                        aria-label={a.pinned ? "Lepas pin" : "Sematkan di atas"}
                      >
                        <PinIcon size={14} />
                      </button>
                    )}
                    {canEdit && (
                      <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openEdit(a)}>Edit</button>
                    )}
                    {canDelete && (
                      <button
                        className="dash-btn dash-btn--danger dash-btn--sm"
                        onClick={() => handleDelete(a.id)}
                        disabled={deleting === a.id}
                      >
                        {deleting === a.id ? "..." : "Hapus"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="dash-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="dash-modal-title">{editing ? "Edit Pengumuman" : "Pengumuman Baru"}</h2>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="ann-title">Judul</label>
              <input
                id="ann-title"
                className="dash-form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={120}
              />
              {fieldErrors.title && <p className="dash-form-error">{fieldErrors.title}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="ann-content">Isi</label>
              <textarea
                id="ann-content"
                className="dash-form-textarea"
                rows={5}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                maxLength={5000}
              />
              {fieldErrors.content && <p className="dash-form-error">{fieldErrors.content}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="ann-status">Status</label>
              <select
                id="ann-status"
                className="dash-form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="dash-modal-actions">
              <button className="dash-btn dash-btn--secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="dash-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .ann-toolbar {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex-wrap: wrap;
        }

        .ann-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4375rem 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-subtle);
          background: var(--color-surface);
          min-width: 220px;
        }

        .ann-search:focus-within {
          border-color: var(--color-accent);
        }

        .ann-search-input {
          border: none;
          outline: none;
          background: transparent;
          color: var(--color-text);
          font-size: 0.82rem;
          width: 100%;
        }

        .ann-pin {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          background: var(--color-warning-soft);
          color: var(--color-warning);
        }

        .ann-pin-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--color-text-subtle);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .ann-pin-btn:hover {
          color: var(--color-warning);
          border-color: var(--color-warning);
        }

        .ann-pin-btn--active {
          color: var(--color-warning);
          border-color: var(--color-warning);
          background: var(--color-warning-soft);
        }

        @media (max-width: 480px) {
          .ann-search {
            min-width: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
