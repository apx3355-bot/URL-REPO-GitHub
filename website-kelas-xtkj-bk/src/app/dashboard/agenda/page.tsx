"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashCSS, SectionTitle, formatDate } from "@/components/dashboard/SharedUI";
import { SearchIcon, CalendarPlusIcon } from "@/components/Icons";

interface Event {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  createdBy: { username: string; profile: { fullName: string } | null } | null;
}

const emptyForm = {
  title: "",
  description: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  location: "",
};

export default function AgendaPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [now, setNow] = useState<string>(new Date().toISOString());
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query = "", sc = scope) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ scope: sc });
      if (query) params.set("q", query);
      const res = await fetch(`/api/events?${params}`);
      if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/agenda";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setNow(data.now);
      } else {
        setError("Tidak dapat memuat agenda.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user && setMe({ role: d.user.role }))
      .catch(() => {});
  }, [load]);

  const canManage = me?.role === "DEVELOPER" || me?.role === "WALI_KELAS";

  function onSearchChange(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 300);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(ev: Event) {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      eventDate: ev.eventDate.slice(0, 10),
      startTime: ev.startTime ?? "",
      endTime: ev.endTime ?? "",
      location: ev.location ?? "",
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
      const res = await fetch(editing ? `/api/events/${editing.id}` : "/api/events", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setError(data.error || "Gagal menyimpan agenda.");
        return;
      }
      setSuccess(editing ? "Agenda diperbarui." : `Agenda dibuat${data.notified ? ` (${data.notified} notifikasi terkirim)` : ""}.`);
      setShowModal(false);
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus agenda ini?")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal menghapus agenda.");
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSuccess("Agenda dihapus.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header dash-page-header--row">
        <div>
          <h1 className="dash-page-title">Agenda Kelas</h1>
          <p className="dash-page-desc">Kegiatan, tugas besar, dan acara kelas.</p>
        </div>
        <div className="dash-search-wrap">
          <SearchIcon size={14} />
          <input
            className="dash-search-input"
            placeholder="Cari agenda..."
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari agenda"
          />
        </div>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      <div className="agenda-toolbar">
        <div className="agenda-tabs" role="tablist" aria-label="Filter agenda">
          <button
            role="tab"
            aria-selected={scope === "upcoming"}
            className={`agenda-tab ${scope === "upcoming" ? "agenda-tab--active" : ""}`}
            onClick={() => {
              setScope("upcoming");
              load(q, "upcoming");
            }}
          >
            Mendatang
          </button>
          <button
            role="tab"
            aria-selected={scope === "past"}
            className={`agenda-tab ${scope === "past" ? "agenda-tab--active" : ""}`}
            onClick={() => {
              setScope("past");
              load(q, "past");
            }}
          >
            Selesai
          </button>
        </div>
        {canManage && (
          <button className="dash-btn" onClick={openCreate}>
            + Agenda Baru
          </button>
        )}
      </div>

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : events.length === 0 ? (
        <div className="dash-empty">
          <CalendarPlusIcon size={24} />
          {q
            ? `Tidak ada hasil untuk "${q}".`
            : scope === "upcoming"
              ? "Belum ada agenda mendatang."
              : "Belum ada agenda selesai."}
        </div>
      ) : (
        <div className="agenda-list">
          {events.map((ev) => {
            const isPast = new Date(ev.eventDate) < new Date(now);
            return (
              <article key={ev.id} className="dash-card agenda-card">
                <div className="agenda-date" aria-hidden="true">
                  <span className="agenda-day">{new Date(ev.eventDate).getDate()}</span>
                  <span className="agenda-month">
                    {new Date(ev.eventDate).toLocaleDateString("id-ID", { month: "short" })}
                  </span>
                </div>
                <div className="agenda-body">
                  <h3 className="agenda-title">
                    {ev.title}
                    <span className={`agenda-badge ${isPast ? "agenda-badge--past" : "agenda-badge--soon"}`}>
                      {isPast ? "Selesai" : "Mendatang"}
                    </span>
                  </h3>
                  {ev.description && <p className="agenda-desc">{ev.description}</p>}
                  <p className="agenda-meta">
                    {formatDate(ev.eventDate)}
                    {ev.startTime && ` · ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ""} WIB`}
                    {ev.location && ` · ${ev.location}`}
                  </p>
                </div>
                {canManage && (
                  <div className="agenda-actions">
                    <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openEdit(ev)}>
                      Edit
                    </button>
                    <button
                      className="dash-btn dash-btn--danger dash-btn--sm"
                      onClick={() => handleDelete(ev.id)}
                      disabled={deleting === ev.id}
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label={editing ? "Edit agenda" : "Agenda baru"}>
          <div className="dash-modal">
            <SectionTitle>{editing ? "Edit Agenda" : "Agenda Baru"}</SectionTitle>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="ev-title">Judul</label>
              <input
                id="ev-title"
                className="dash-form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={120}
              />
              {fieldErrors.title && <p className="dash-form-error">{fieldErrors.title}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="ev-date">Tanggal</label>
              <input
                id="ev-date"
                type="date"
                className="dash-form-input"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              />
              {fieldErrors.eventDate && <p className="dash-form-error">{fieldErrors.eventDate}</p>}
            </div>
            <div className="agenda-form-row">
              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="ev-start">Mulai (opsional)</label>
                <input
                  id="ev-start"
                  type="time"
                  className="dash-form-input"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
                {fieldErrors.startTime && <p className="dash-form-error">{fieldErrors.startTime}</p>}
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="ev-end">Selesai (opsional)</label>
                <input
                  id="ev-end"
                  type="time"
                  className="dash-form-input"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
                {fieldErrors.endTime && <p className="dash-form-error">{fieldErrors.endTime}</p>}
              </div>
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="ev-loc">Lokasi (opsional)</label>
              <input
                id="ev-loc"
                className="dash-form-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="mis. Lab Jaringan"
                maxLength={120}
              />
              {fieldErrors.location && <p className="dash-form-error">{fieldErrors.location}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="ev-desc">Deskripsi (opsional)</label>
              <textarea
                id="ev-desc"
                className="dash-form-textarea"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={2000}
              />
              {fieldErrors.description && <p className="dash-form-error">{fieldErrors.description}</p>}
            </div>
            <div className="agenda-modal-actions">
              <button className="dash-btn dash-btn--secondary" onClick={() => setShowModal(false)} disabled={saving}>
                Batal
              </button>
              <button className="dash-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : editing ? "Simpan" : "Buat Agenda"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .agenda-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }

        .agenda-list {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          max-width: 760px;
        }

        .agenda-card {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .agenda-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 60px;
          flex-shrink: 0;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-accent-soft);
        }

        .agenda-day {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-accent);
          line-height: 1.1;
        }

        .agenda-month {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--color-accent);
        }

        .agenda-body {
          flex: 1;
          min-width: 0;
        }

        .agenda-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          font-size: 0.95rem;
          font-weight: 650;
          color: var(--color-text);
        }

        .agenda-badge {
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
        }

        .agenda-badge--soon {
          background: var(--color-success-soft);
          color: var(--color-success);
        }

        .agenda-badge--past {
          background: var(--color-border-light);
          color: var(--color-text-muted);
        }

        .agenda-desc {
          font-size: 0.82rem;
          color: var(--color-text-muted);
          line-height: 1.5;
          margin: 0.25rem 0;
        }

        .agenda-meta {
          font-size: 0.72rem;
          color: var(--color-text-subtle);
        }

        .agenda-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .agenda-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .agenda-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.625rem;
          margin-top: 0.5rem;
        }

        @media (max-width: 560px) {
          .agenda-card {
            flex-wrap: wrap;
          }

          .agenda-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .agenda-form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
