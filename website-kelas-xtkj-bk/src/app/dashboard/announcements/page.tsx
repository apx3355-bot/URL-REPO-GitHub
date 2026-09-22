"use client";

import { useCallback, useEffect, useState } from "react";
import { DashCSS, formatDateTime } from "@/components/dashboard/SharedUI";

interface Announcement {
  id: number;
  title: string;
  content: string;
  status: string;
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [annRes, meRes] = await Promise.all([
        fetch("/api/announcements?all=1"),
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
        {canCreate && (
          <button className="dash-btn" onClick={openCreate}>+ Pengumuman Baru</button>
        )}
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="dash-empty">Belum ada pengumuman.</div>
      ) : (
        <div className="dash-list">
          {items.map((a) => {
            const canEdit = me?.role === "DEVELOPER" || (me?.role === "WALI_KELAS" && a.author?.username === me.username);
            return (
              <div key={a.id} className="dash-item" style={{ background: "var(--color-surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className="dash-item-title">{a.title}</span>
                      <span className={`dash-status dash-status--${a.status.toLowerCase()}`}>{a.status}</span>
                    </div>
                    <div className="dash-item-desc">{a.content}</div>
                    <div className="dash-item-meta">
                      {a.author?.profile?.fullName ?? a.author?.username ?? "—"} · {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
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
    </div>
  );
}
