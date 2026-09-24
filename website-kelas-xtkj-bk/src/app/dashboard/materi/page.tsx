"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashCSS, SectionTitle, formatDateTime } from "@/components/dashboard/SharedUI";
import { SearchIcon } from "@/components/Icons";

interface Material {
  id: number;
  title: string;
  description: string | null;
  subject: string | null;
  externalUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: { username: string; profile: { fullName: string | null } | null } | null;
}

interface MaterialFileField {
  name: string;
  dataUrl: string;
}

const emptyForm = {
  title: "",
  description: "",
  subject: "",
  externalUrl: "",
  status: "PUBLISHED" as "PUBLISHED" | "DRAFT",
};

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default function MateriPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<MaterialFileField | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (query = "", subj = "") => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (subj) params.set("subject", subj);
        const res = await fetch(`/api/materials?${params}`);
        if (res.status === 401) {
          window.location.href = "/login?next=/dashboard/materi";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setMaterials(data.materials);
          setSubjects(data.subjects ?? []);
        } else {
          setError("Tidak dapat memuat materi.");
        }
      } catch {
        setError("Tidak dapat terhubung ke server.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
    debounceRef.current = setTimeout(() => load(v, subject), 300);
  }

  function onSubjectChange(v: string) {
    setSubject(v);
    load(q, v);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setRemoveFile(false);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(m: Material) {
    setEditing(m);
    setForm({
      title: m.title,
      description: m.description ?? "",
      subject: m.subject ?? "",
      externalUrl: m.externalUrl ?? "",
      status: (m.status as "PUBLISHED" | "DRAFT") ?? "PUBLISHED",
    });
    setFile(null);
    setRemoveFile(false);
    setFieldErrors({});
    setShowModal(true);
  }

  async function readFile(f: File): Promise<MaterialFileField> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, dataUrl: reader.result as string });
      reader.onerror = () => reject(new Error("read-error"));
      reader.readAsDataURL(f);
    });
  }

  async function handleFilePick(f: File | null) {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setFieldErrors({ file: "Ukuran file maksimal 2 MB." });
      return;
    }
    try {
      const field = await readFile(f);
      setFile(field);
      setRemoveFile(false);
      setFieldErrors({});
    } catch {
      setFieldErrors({ file: "Gagal membaca file." });
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const res = await fetch(editing ? `/api/materials/${editing.id}` : "/api/materials", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          file: file ? { dataUrl: file.dataUrl, name: file.name } : null,
          removeFile,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setError(data.error || "Gagal menyimpan materi.");
        return;
      }
      setSuccess(
        editing
          ? "Materi diperbarui."
          : `Materi dipublikasikan${data.notified ? ` (${data.notified} notifikasi terkirim)` : ""}.`
      );
      setShowModal(false);
      load(q, subject);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus materi ini?")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal menghapus materi.");
        return;
      }
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setSuccess("Materi dihapus.");
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
          <h1 className="dash-page-title">Materi &amp; Resource</h1>
          <p className="dash-page-desc">Materi pembelajaran dan resource belajar kelas.</p>
        </div>
        <div className="dash-search-wrap">
          <SearchIcon size={14} />
          <input
            className="dash-search-input"
            placeholder="Cari materi..."
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari materi"
          />
        </div>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {subjects.length > 0 && (
        <div className="materi-filter">
          <button
            className={`materi-chip ${subject === "" ? "materi-chip--active" : ""}`}
            onClick={() => onSubjectChange("")}
          >
            Semua
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              className={`materi-chip ${subject === s ? "materi-chip--active" : ""}`}
              onClick={() => onSubjectChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {canManage && (
        <div className="materi-toolbar">
          <button className="dash-btn" onClick={openCreate}>
            + Materi Baru
          </button>
        </div>
      )}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : materials.length === 0 ? (
        <div className="dash-empty">
          {q || subject
            ? "Tidak ada materi yang cocok dengan filter."
            : "Belum ada materi. Materi yang ditambahkan wali kelas/developer akan tampil di sini."}
        </div>
      ) : (
        <div className="materi-list">
          {materials.map((m) => (
            <article key={m.id} className="dash-card materi-card">
              <div className="materi-body">
                <div className="materi-titlerow">
                  <h3 className="materi-title">{m.title}</h3>
                  {me?.role !== "ANGGOTA" && (
                    <span className={`dash-status dash-status--${m.status.toLowerCase()}`}>
                      {m.status === "PUBLISHED" ? "Publik" : "Draft"}
                      </span>
                  )}
                </div>
                {m.subject && <span className="materi-subject">{m.subject}</span>}
                {m.description && <p className="materi-desc">{m.description}</p>}
                {m.externalUrl && (
                  <a
                    className="materi-link"
                    href={m.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.externalUrl.replace(/^https?:\/\//, "").slice(0, 60)}
                    {" ↗"}
                  </a>
                )}
                <p className="materi-meta">
                  {m.author?.profile?.fullName || m.author?.username} · {formatDateTime(m.createdAt)}
                  {m.updatedAt !== m.createdAt && ` · diubah ${formatDateTime(m.updatedAt)}`}
                </p>
              </div>
              <div className="materi-side">
                {m.fileName && (
                  <a
                    className="dash-btn dash-btn--secondary dash-btn--sm"
                    href={`/api/materials/${m.id}/file`}
                  >
                    ⬇ {m.fileName.length > 18 ? `${m.fileName.slice(0, 18)}…` : m.fileName}
                    {m.fileSize ? ` (${humanSize(m.fileSize)})` : ""}
                  </a>
                )}
                {canManage && (
                  <div className="materi-actions">
                    <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openEdit(m)}>
                      Edit
                    </button>
                    <button
                      className="dash-btn dash-btn--danger dash-btn--sm"
                      onClick={() => handleDelete(m.id)}
                      disabled={deleting === m.id}
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label={editing ? "Edit materi" : "Materi baru"}>
          <div className="dash-modal dash-modal--wide">
            <SectionTitle>{editing ? "Edit Materi" : "Materi Baru"}</SectionTitle>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="mat-title">Judul *</label>
              <input
                id="mat-title"
                className="dash-form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={160}
              />
              {fieldErrors.title && <p className="dash-form-error">{fieldErrors.title}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="mat-subject">Mata pelajaran / topik</label>
              <input
                id="mat-subject"
                className="dash-form-input"
                placeholder="cth. Jaringan Dasar"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                maxLength={80}
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="mat-desc">Deskripsi</label>
              <textarea
                id="mat-desc"
                className="dash-form-textarea"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={4000}
              />
              {fieldErrors.description && <p className="dash-form-error">{fieldErrors.description}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="mat-url">Link resource eksternal</label>
              <input
                id="mat-url"
                className="dash-form-input"
                placeholder="https://..."
                value={form.externalUrl}
                onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                maxLength={500}
              />
              {fieldErrors.externalUrl && <p className="dash-form-error">{fieldErrors.externalUrl}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="mat-file">Lampiran (PDF/gambar/ZIP, maks 2 MB)</label>
              <input
                id="mat-file"
                type="file"
                className="dash-form-input"
                accept=".pdf,.png,.jpg,.jpeg,.zip,.docx,.pptx,.xlsx"
                onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
              />
              {fieldErrors.file && <p className="dash-form-error">{fieldErrors.file}</p>}
              {editing?.fileName && !removeFile && !file && (
                <p className="materi-fileinfo">
                  Lampiran saat ini: {editing.fileName}{" "}
                  <button type="button" className="materi-file-remove" onClick={() => setRemoveFile(true)}>
                    (hapus lampiran saat simpan)
                  </button>
                </p>
              )}
              {removeFile && (
                <p className="materi-fileinfo">Lampiran akan dihapus saat disimpan. <button type="button" className="materi-file-remove" onClick={() => setRemoveFile(false)}>batal</button></p>
              )}
              {file && <p className="materi-fileinfo">Lampiran baru siap: {file.name}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="mat-status">Status</label>
              <select
                id="mat-status"
                className="dash-form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "PUBLISHED" | "DRAFT" })}
              >
                <option value="PUBLISHED">Publik (terlihat anggota)</option>
                <option value="DRAFT">Draft (hanya pengelola)</option>
              </select>
            </div>
            <div className="dash-modal-actions">
              <button className="dash-btn dash-btn--secondary" onClick={() => setShowModal(false)} disabled={saving}>
                Batal
              </button>
              <button className="dash-btn" onClick={handleSave} disabled={saving || (!!removeFile && !!file)}>
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .materi-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          margin-bottom: 1rem;
        }
        .materi-chip {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.3125rem 0.75rem;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .materi-chip:hover { border-color: var(--color-accent); color: var(--color-accent); }
        .materi-chip--active {
          background: var(--color-accent-soft);
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        .materi-toolbar { margin-bottom: 1rem; }
        .materi-list {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          max-width: 780px;
        }
        .materi-card {
          display: flex;
          gap: 1rem;
          justify-content: space-between;
        }
        .materi-body { flex: 1; min-width: 0; }
        .materi-titlerow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .materi-title {
          font-size: 0.95rem;
          font-weight: 650;
          color: var(--color-text);
        }
        .materi-subject {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-accent);
          background: var(--color-accent-soft);
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          margin-top: 0.375rem;
        }
        .materi-desc {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          line-height: 1.6;
          margin-top: 0.375rem;
        }
        .materi-link {
          display: inline-block;
          font-size: 0.75rem;
          color: var(--color-accent);
          margin-top: 0.375rem;
          word-break: break-all;
        }
        .materi-meta {
          font-size: 0.7rem;
          color: var(--color-text-subtle);
          margin-top: 0.5rem;
        }
        .materi-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .materi-actions {
          display: flex;
          gap: 0.375rem;
        }
        .materi-fileinfo {
          font-size: 0.72rem;
          color: var(--color-text-subtle);
          margin-top: 0.375rem;
        }
        .materi-file-remove {
          background: none;
          border: none;
          color: var(--color-danger);
          cursor: pointer;
          font-size: 0.72rem;
          padding: 0;
        }
        .dash-modal--wide { max-width: 560px; }
        @media (max-width: 640px) {
          .materi-card { flex-direction: column; }
          .materi-side {
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
