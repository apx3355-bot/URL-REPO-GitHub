"use client";

import { useCallback, useEffect, useState } from "react";
import { DashCSS } from "@/components/dashboard/SharedUI";

interface StructureEntry {
  id: number;
  name: string;
  position: string;
  tier: string;
  description: string | null;
  order: number;
}

const TIERS: { value: string; label: string }[] = [
  { value: "teacher", label: "Wali Kelas / Pembimbing" },
  { value: "leader", label: "Ketua" },
  { value: "deputy", label: "Wakil Ketua" },
  { value: "secretary", label: "Sekretaris" },
  { value: "treasurer", label: "Bendahara" },
  { value: "section", label: "Seksi" },
];

const tierLabel = (t: string) => TIERS.find((x) => x.value === t)?.label ?? t;

const emptyForm = { name: "", position: "", tier: "section", description: "", order: 0 };

export default function StructurePage() {
  const [items, setItems] = useState<StructureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StructureEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/structure");
      if (res.ok) {
        const data = await res.json();
        setItems(data.structure);
      } else if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/structure";
        return;
      } else {
        const data = await res.json();
        setError(data.error || "Gagal memuat data.");
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

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, order: items.length + 1 });
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(s: StructureEntry) {
    setEditing(s);
    setForm({
      name: s.name,
      position: s.position,
      tier: s.tier,
      description: s.description ?? "",
      order: s.order,
    });
    setFieldErrors({});
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const url = editing ? `/api/structure/${editing.id}` : "/api/structure";
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
      setSuccess(editing ? "Struktur berhasil diubah." : "Struktur berhasil ditambahkan.");
      setShowModal(false);
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus data struktur ini?")) return;
    setDeleting(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/structure/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menghapus.");
        return;
      }
      setSuccess("Struktur berhasil dihapus.");
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
          <h1 className="dash-page-title">Struktur Kelas</h1>
          <p className="dash-page-desc">Kelola susunan organisasi kelas.</p>
        </div>
        <button className="dash-btn" onClick={openCreate}>+ Data Struktur</button>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="dash-empty">Belum ada data struktur.</div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Jabatan</th>
                <th>Tier</th>
                <th>Urutan</th>
                <th style={{ width: "140px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.position}</td>
                  <td>{tierLabel(s.tier)}</td>
                  <td>{s.order}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openEdit(s)}>Edit</button>
                      <button
                        className="dash-btn dash-btn--danger dash-btn--sm"
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                      >
                        {deleting === s.id ? "..." : "Hapus"}
                      </button>
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
            <h2 className="dash-modal-title">{editing ? "Edit Struktur" : "Data Struktur Baru"}</h2>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="s-name">Nama</label>
              <input id="s-name" className="dash-form-input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
              {fieldErrors.name && <p className="dash-form-error">{fieldErrors.name}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="s-pos">Jabatan</label>
              <input id="s-pos" className="dash-form-input" value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })} maxLength={60} />
              {fieldErrors.position && <p className="dash-form-error">{fieldErrors.position}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="s-tier">Tier</label>
              <select id="s-tier" className="dash-form-select" value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {fieldErrors.tier && <p className="dash-form-error">{fieldErrors.tier}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="s-desc">Deskripsi (opsional)</label>
              <input id="s-desc" className="dash-form-input" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} />
              {fieldErrors.description && <p className="dash-form-error">{fieldErrors.description}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="s-order">Urutan tampil</label>
              <input id="s-order" className="dash-form-input" type="number" min={0} max={99} value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              {fieldErrors.order && <p className="dash-form-error">{fieldErrors.order}</p>}
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
