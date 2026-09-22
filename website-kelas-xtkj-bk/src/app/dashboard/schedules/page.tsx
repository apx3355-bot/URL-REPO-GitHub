"use client";

import { useCallback, useEffect, useState } from "react";
import { DashCSS, SectionTitle } from "@/components/dashboard/SharedUI";

interface Schedule {
  id: number;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string | null;
  room: string | null;
}

interface Me {
  role: "DEVELOPER" | "WALI_KELAS" | "ANGGOTA";
  username: string;
}

const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const dayNames: Record<string, string> = {
  SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu",
  KAMIS: "Kamis", JUMAT: "Jumat", SABTU: "Sabtu",
};

const emptyForm = { day: "SENIN", startTime: "07:00", endTime: "09:30", subject: "", teacher: "", room: "" };

export default function SchedulesPage() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, meRes] = await Promise.all([
        fetch("/api/schedules"),
        fetch("/api/auth/me"),
      ]);
      if (sRes.ok) {
        const data = await sRes.json();
        setItems(data.schedules);
      } else if (sRes.status === 401) {
        window.location.href = "/login?next=/dashboard/schedules";
        return;
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

  const canCreate = me?.role === "DEVELOPER" || me?.role === "WALI_KELAS";
  const canEdit = canCreate;
  const canDelete = me?.role === "DEVELOPER";

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(s: Schedule) {
    setEditing(s);
    setForm({
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      subject: s.subject,
      teacher: s.teacher ?? "",
      room: s.room ?? "",
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
      const url = editing ? `/api/schedules/${editing.id}` : "/api/schedules";
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
      setSuccess(editing ? "Jadwal berhasil diubah." : "Jadwal berhasil ditambahkan.");
      setShowModal(false);
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus jadwal ini?")) return;
    setDeleting(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menghapus.");
        return;
      }
      setSuccess("Jadwal berhasil dihapus.");
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
          <h1 className="dash-page-title">Jadwal Pelajaran</h1>
          <p className="dash-page-desc">Kelola jadwal mingguan kelas.</p>
        </div>
        {canCreate && (
          <button className="dash-btn" onClick={openCreate}>+ Jadwal Baru</button>
        )}
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="dash-empty">Belum ada jadwal.</div>
      ) : (
        DAYS.map((day) => {
          const dayItems = items
            .filter((s) => s.day === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (dayItems.length === 0) return null;
          return (
            <div key={day} style={{ marginBottom: "1.5rem" }}>
              <SectionTitle>{dayNames[day]}</SectionTitle>
              <div className="dash-list">
                {dayItems.map((s) => (
                  <div key={s.id} className="dash-item" style={{ background: "var(--color-surface)", display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dash-item-title">
                        {s.startTime}–{s.endTime} · {s.subject}
                      </div>
                      <div className="dash-item-desc">
                        {[s.teacher, s.room].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                      {canEdit && (
                        <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openEdit(s)}>Edit</button>
                      )}
                      {canDelete && (
                        <button
                          className="dash-btn dash-btn--danger dash-btn--sm"
                          onClick={() => handleDelete(s.id)}
                          disabled={deleting === s.id}
                        >
                          {deleting === s.id ? "..." : "Hapus"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {showModal && (
        <div className="dash-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="dash-modal-title">{editing ? "Edit Jadwal" : "Jadwal Baru"}</h2>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="sc-day">Hari</label>
              <select id="sc-day" className="dash-form-select" value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}>
                {DAYS.map((d) => <option key={d} value={d}>{dayNames[d]}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="sc-start">Jam Mulai</label>
                <input id="sc-start" className="dash-form-input" type="time" value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                {fieldErrors.startTime && <p className="dash-form-error">{fieldErrors.startTime}</p>}
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="sc-end">Jam Selesai</label>
                <input id="sc-end" className="dash-form-input" type="time" value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                {fieldErrors.endTime && <p className="dash-form-error">{fieldErrors.endTime}</p>}
              </div>
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="sc-subject">Mata Pelajaran</label>
              <input id="sc-subject" className="dash-form-input" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={80} />
              {fieldErrors.subject && <p className="dash-form-error">{fieldErrors.subject}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="sc-teacher">Guru (opsional)</label>
              <input id="sc-teacher" className="dash-form-input" value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })} maxLength={80} />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="sc-room">Ruangan (opsional)</label>
              <input id="sc-room" className="dash-form-input" value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })} maxLength={40} />
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
