"use client";

import { useCallback, useEffect, useState } from "react";
import { DashCSS } from "@/components/dashboard/SharedUI";

interface Member {
  id: number;
  fullName: string;
  nisn: string | null;
  position: string | null;
}

interface Me {
  role: "DEVELOPER" | "WALI_KELAS" | "ANGGOTA";
  username: string;
}

const emptyForm = { fullName: "", nisn: "", position: "" };

export default function MembersPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, meRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/auth/me"),
      ]);
      if (mRes.ok) {
        const data = await mRes.json();
        setItems(data.members);
      } else if (mRes.status === 401) {
        window.location.href = "/login?next=/dashboard/members";
        return;
      } else if (mRes.status === 403) {
        setError("Anda tidak memiliki izin mengelola anggota.");
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setMe(data.user);
      }
    } catch {
      setError("Tidak dapat memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canCreate = me?.role === "DEVELOPER";
  const canEdit = me?.role === "DEVELOPER" || me?.role === "WALI_KELAS";
  const canDelete = me?.role === "DEVELOPER";

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({ fullName: m.fullName, nisn: m.nisn ?? "", position: m.position ?? "" });
    setFieldErrors({});
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const url = editing ? `/api/members/${editing.id}` : "/api/members";
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
      setSuccess(editing ? "Data anggota berhasil diubah." : "Anggota berhasil ditambahkan.");
      setShowModal(false);
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus anggota ini? Tindakan tidak dapat dibatalkan.")) return;
    setDeleting(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menghapus.");
        return;
      }
      setSuccess("Anggota berhasil dihapus.");
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
          <h1 className="dash-page-title">Anggota Kelas</h1>
          <p className="dash-page-desc">Kelola data {items.length} anggota kelas.</p>
        </div>
        {canCreate && (
          <button className="dash-btn" onClick={openCreate}>+ Anggota Baru</button>
        )}
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="dash-empty">Belum ada anggota terdaftar.</div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>NISN</th>
                <th>Jabatan</th>
                <th style={{ width: "140px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m, i) => (
                <tr key={m.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{m.fullName}</td>
                  <td>{m.nisn ?? "—"}</td>
                  <td>{m.position ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      {canEdit && (
                        <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openEdit(m)}>Edit</button>
                      )}
                      {canDelete && (
                        <button
                          className="dash-btn dash-btn--danger dash-btn--sm"
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                        >
                          {deleting === m.id ? "..." : "Hapus"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="dash-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="dash-modal-title">{editing ? "Edit Anggota" : "Anggota Baru"}</h2>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="m-name">Nama Lengkap</label>
              <input
                id="m-name"
                className="dash-form-input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                maxLength={100}
              />
              {fieldErrors.fullName && <p className="dash-form-error">{fieldErrors.fullName}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="m-nisn">NISN (opsional)</label>
              <input
                id="m-nisn"
                className="dash-form-input"
                value={form.nisn}
                onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                inputMode="numeric"
                maxLength={10}
              />
              {fieldErrors.nisn && <p className="dash-form-error">{fieldErrors.nisn}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="m-pos">Jabatan (opsional)</label>
              <input
                id="m-pos"
                className="dash-form-input"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Ketua Kelas, Bendahara, atau kosongkan"
                maxLength={50}
              />
              {fieldErrors.position && <p className="dash-form-error">{fieldErrors.position}</p>}
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
