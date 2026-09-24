"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashCSS, SectionTitle, formatDateTime } from "@/components/dashboard/SharedUI";
import { SearchIcon } from "@/components/Icons";

interface Assignment {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  fileName: string | null;
  fileSize: number | null;
  status: string;
  createdAt: string;
  author: { username: string; profile: { fullName: string | null } | null } | null;
  _count: { submissions: number };
}

interface MySubmission {
  id: number;
  submittedAt: string;
  isLate: boolean;
  grade: number | null;
  feedback: string | null;
}

interface GraderSubmission {
  id: number;
  note: string | null;
  fileName: string | null;
  fileSize: number | null;
  submittedAt: string;
  isLate: boolean;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
  student: { username: string; profile: { fullName: string | null } | null } | null;
}

interface FileField {
  name: string;
  dataUrl: string;
}

type Scope = "active" | "past";

const emptyForm = {
  title: "",
  description: "",
  dueDate: "",
  status: "PUBLISHED" as "PUBLISHED" | "DRAFT",
};

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default function TugasPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Record<number, MySubmission>>({});
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("active");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<FileField | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [subTarget, setSubTarget] = useState<Assignment | null>(null); // kumpul (murid)
  const [revTarget, setRevTarget] = useState<Assignment | null>(null); // review (grader)
  const [subs, setSubs] = useState<GraderSubmission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subNote, setSubNote] = useState("");
  const [subFile, setSubFile] = useState<FileField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<GraderSubmission | null>(null);
  const [gradeVal, setGradeVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");
  const [grading, setGrading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query = "", sc = scope) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ scope: sc });
      if (query) params.set("q", query);
      const res = await fetch(`/api/assignments?${params}`);
      if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/tugas";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
        setMySubmissions(data.mySubmissions ?? {});
      } else {
        setError("Tidak dapat memuat tugas.");
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

  const isStudent = me?.role === "ANGGOTA";
  const isGrader = me?.role === "DEVELOPER" || me?.role === "WALI_KELAS";

  function onSearchChange(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 300);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setRemoveFile(false);
    setFieldErrors({});
    setShowFormModal(true);
  }

  function openEdit(a: Assignment) {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description,
      dueDate: a.dueDate.slice(0, 16),
      status: (a.status as "PUBLISHED" | "DRAFT") ?? "PUBLISHED",
    });
    setFile(null);
    setRemoveFile(false);
    setFieldErrors({});
    setShowFormModal(true);
  }

  async function readFile(f: File): Promise<FileField> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, dataUrl: reader.result as string });
      reader.onerror = () => reject(new Error("read-error"));
      reader.readAsDataURL(f);
    });
  }

  async function pickFormFile(f: File | null) {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setFieldErrors({ file: "Ukuran file maksimal 2 MB." });
      return;
    }
    try {
      setFile(await readFile(f));
      setRemoveFile(false);
      setFieldErrors({});
    } catch {
      setFieldErrors({ file: "Gagal membaca file." });
    }
  }

  async function pickSubFile(f: File | null) {
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      setError("Ukuran file submission maksimal 3 MB.");
      return;
    }
    try {
      setSubFile(await readFile(f));
      setError(null);
    } catch {
      setError("Gagal membaca file.");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const res = await fetch(editing ? `/api/assignments/${editing.id}` : "/api/assignments", {
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
        setError(data.error || "Gagal menyimpan tugas.");
        return;
      }
      setSuccess(
        editing
          ? "Tugas diperbarui."
          : `Tugas dibuat${data.notified ? ` (${data.notified} notifikasi terkirim)` : ""}.`
      );
      setShowFormModal(false);
      load(q);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus tugas ini? Semua submission di dalamnya juga akan terhapus.")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal menghapus tugas.");
        return;
      }
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setSuccess("Tugas dihapus.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setDeleting(null);
    }
  }

  function openSubmit(a: Assignment) {
    setSubTarget(a);
    setSubNote("");
    setSubFile(null);
  }

  async function handleSubmit() {
    if (!subTarget) return;
    if (!subNote && !subFile) {
      setError("Sertakan catatan jawaban atau file lampiran.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/assignments/${subTarget.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: subNote,
          file: subFile ? { dataUrl: subFile.dataUrl, name: subFile.name } : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengumpulkan tugas.");
        return;
      }
      setSuccess(
        data.revised
          ? "Revisi submission terkirim."
          : data.submission.isLate
            ? "Tugas terkumpul (terlambat — melewati deadline)."
            : "Tugas terkumpul tepat waktu."
      );
      setSubTarget(null);
      load(q);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openReview(a: Assignment) {
    setRevTarget(a);
    setSubsLoading(true);
    try {
      const res = await fetch(`/api/assignments/${a.id}/submissions`);
      const data = await res.json();
      if (res.ok) setSubs(data.submissions);
      else setError(data.error || "Gagal memuat submission.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSubsLoading(false);
    }
  }

  function openGrade(s: GraderSubmission) {
    setGradeTarget(s);
    setGradeVal(s.grade !== null ? String(s.grade) : "");
    setFeedbackVal(s.feedback ?? "");
  }

  async function handleGrade() {
    if (!gradeTarget) return;
    setGrading(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${gradeTarget.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: Number(gradeVal), feedback: feedbackVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan nilai.");
        return;
      }
      setSuccess(`Nilai tersimpan untuk ${gradeTarget.student?.profile?.fullName ?? gradeTarget.student?.username}.`);
      setGradeTarget(null);
      if (revTarget) openReview(revTarget);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setGrading(false);
    }
  }

  function deadlineInfo(a: Assignment): { label: string; cls: string } {
    const due = new Date(a.dueDate);
    const now = new Date();
    const diffDays = (due.getTime() - now.getTime()) / 86_400_000;
    if (diffDays < 0) return { label: "Lewat deadline", cls: "tugas-badge--past" };
    if (diffDays <= 1) return { label: "Deadline ≤ 24 jam", cls: "tugas-badge--urgent" };
    return { label: `Sisa ${Math.ceil(diffDays)} hari`, cls: "tugas-badge--ok" };
  }

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header dash-page-header--row">
        <div>
          <h1 className="dash-page-title">Tugas</h1>
          <p className="dash-page-desc">
            {isStudent
              ? "Kumpulkan tugas sebelum deadline; lihat nilai & feedback."
              : "Kelola tugas, pantau submission, dan beri nilai."}
          </p>
        </div>
        <div className="dash-search-wrap">
          <SearchIcon size={14} />
          <input
            className="dash-search-input"
            placeholder="Cari tugas..."
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari tugas"
          />
        </div>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      <div className="tugas-toolbar">
        <div className="agenda-tabs" role="tablist" aria-label="Filter tugas">
          <button
            role="tab"
            aria-selected={scope === "active"}
            className={`agenda-tab ${scope === "active" ? "agenda-tab--active" : ""}`}
            onClick={() => {
              setScope("active");
              load(q, "active");
            }}
          >
            Aktif
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
            Lewat Deadline
          </button>
        </div>
        {isGrader && (
          <button className="dash-btn" onClick={openCreate}>
            + Tugas Baru
          </button>
        )}
      </div>

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : assignments.length === 0 ? (
        <div className="dash-empty">
          {q
            ? `Tidak ada hasil untuk "${q}".`
            : scope === "active"
              ? "Tidak ada tugas aktif. 🎉"
              : "Belum ada tugas lewat deadline."}
        </div>
      ) : (
        <div className="tugas-list">
          {assignments.map((a) => {
            const my = mySubmissions[a.id];
            const dl = deadlineInfo(a);
            return (
              <article key={a.id} className="dash-card tugas-card">
                <div className="tugas-body">
                  <div className="tugas-titlerow">
                    <h3 className="tugas-title">{a.title}</h3>
                    <span className={`tugas-badge ${dl.cls}`}>{dl.label}</span>
                    {isGrader && me?.role !== "ANGGOTA" && a.status === "DRAFT" && (
                      <span className="dash-status dash-status--draft">Draft</span>
                    )}
                  </div>
                  <p className="tugas-desc">{a.description}</p>
                  <p className="tugas-meta">
                    Deadline: <strong>{formatDateTime(a.dueDate)}</strong>
                    {` · oleh ${a.author?.profile?.fullName || a.author?.username}`}
                    {isGrader && ` · ${a._count.submissions} submission`}
                  </p>
                  {a.fileName && (
                    <a className="tugas-attach" href={`/api/assignments/${a.id}/file`}>
                      ⬇ {a.fileName.length > 24 ? `${a.fileName.slice(0, 24)}…` : a.fileName}
                      {a.fileSize ? ` (${humanSize(a.fileSize)})` : ""}
                    </a>
                  )}

                  {isStudent && (
                    <div className="tugas-mysub">
                      {my ? (
                        <>
                          <p className="tugas-mysub-status">
                            ✓ Terkumpul {formatDateTime(my.submittedAt)}
                            {my.isLate && <span className="tugas-badge tugas-badge--past"> Terlambat</span>}
                          </p>
                          {my.grade !== null ? (
                            <p className="tugas-grade">
                              Nilai: <strong>{my.grade}</strong>
                              {my.feedback && ` · ${my.feedback}`}
                            </p>
                          ) : (
                            <p className="tugas-mysub-status tugas-mysub-status--muted">Belum dinilai</p>
                          )}
                        </>
                      ) : (
                        <p className="tugas-mysub-status tugas-mysub-status--muted">Belum dikumpulkan</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="tugas-actions">
                  {isStudent && (
                    <button
                      className={`dash-btn dash-btn--sm ${my ? "dash-btn--secondary" : ""}`}
                      onClick={() => openSubmit(a)}
                    >
                      {my ? "Revisi" : "Kumpulkan"}
                    </button>
                  )}
                  {isGrader && (
                    <>
                      <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openEdit(a)}>
                        Edit
                      </button>
                      <button
                        className="dash-btn dash-btn--danger dash-btn--sm"
                        onClick={() => handleDelete(a.id)}
                        disabled={deleting === a.id}
                      >
                        Hapus
                      </button>
                      <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openReview(a)}>
                        Submission ({a._count.submissions})
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL FORM TUGAS (GRADER): create/edit */}
      {showFormModal && (
        <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label={editing ? "Edit tugas" : "Tugas baru"}>
          <div className="dash-modal dash-modal--wide">
            <SectionTitle>{editing ? "Edit Tugas" : "Tugas Baru"}</SectionTitle>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="as-title">Judul *</label>
              <input
                id="as-title"
                className="dash-form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={160}
              />
              {fieldErrors.title && <p className="dash-form-error">{fieldErrors.title}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="as-desc">Instruksi *</label>
              <textarea
                id="as-desc"
                className="dash-form-textarea"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={4000}
              />
              {fieldErrors.description && <p className="dash-form-error">{fieldErrors.description}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="as-due">Deadline *</label>
              <input
                id="as-due"
                type="datetime-local"
                className="dash-form-input"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
              {fieldErrors.dueDate && <p className="dash-form-error">{fieldErrors.dueDate}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="as-file">Lampiran (PDF/gambar/ZIP, maks 2 MB)</label>
              <input
                id="as-file"
                type="file"
                className="dash-form-input"
                accept=".pdf,.png,.jpg,.jpeg,.zip,.docx,.pptx,.xlsx"
                onChange={(e) => pickFormFile(e.target.files?.[0] ?? null)}
              />
              {fieldErrors.file && <p className="dash-form-error">{fieldErrors.file}</p>}
              {editing?.fileName && !removeFile && !file && (
                <p className="tugas-fileinfo">
                  Lampiran saat ini: {editing.fileName}{" "}
                  <button type="button" className="tugas-file-remove" onClick={() => setRemoveFile(true)}>(hapus saat simpan)</button>
                </p>
              )}
              {removeFile && (
                <p className="tugas-fileinfo">Lampiran akan dihapus saat disimpan. <button type="button" className="tugas-file-remove" onClick={() => setRemoveFile(false)}>batal</button></p>
              )}
              {file && <p className="tugas-fileinfo">Lampiran baru siap: {file.name}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="as-status">Status</label>
              <select
                id="as-status"
                className="dash-form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "PUBLISHED" | "DRAFT" })}
              >
                <option value="PUBLISHED">Publik (terlihat anggota)</option>
                <option value="DRAFT">Draft (hanya pengelola)</option>
              </select>
            </div>
            <div className="dash-modal-actions">
              <button className="dash-btn dash-btn--secondary" onClick={() => setShowFormModal(false)} disabled={saving}>Batal</button>
              <button className="dash-btn" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KUMPUL (MURID) */}
      {subTarget && (
        <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label="Kumpulkan tugas">
          <div className="dash-modal">
            <SectionTitle>Kumpulkan: {subTarget.title}</SectionTitle>
            {subFile ? (
              <p className="tugas-fileinfo">Lampiran siap: {subFile.name}</p>
            ) : null}
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="sub-note">Catatan / jawaban</label>
              <textarea
                id="sub-note"
                className="dash-form-textarea"
                rows={4}
                placeholder="Tulis jawaban, catatan, atau link pekerjaan..."
                value={subNote}
                onChange={(e) => setSubNote(e.target.value)}
                maxLength={4000}
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="sub-file">File (PDF/gambar/ZIP, maks 3 MB)</label>
              <input
                id="sub-file"
                type="file"
                className="dash-form-input"
                accept=".pdf,.png,.jpg,.jpeg,.zip,.docx,.pptx,.xlsx"
                onChange={(e) => pickSubFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="dash-modal-actions">
              <button className="dash-btn dash-btn--secondary" onClick={() => setSubTarget(null)} disabled={submitting}>
                Batal
              </button>
              <button className="dash-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Mengirim..." : "Kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVIEW + GRADE (GRADER) */}
      {revTarget && (
        <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label="Review submission">
          <div className="dash-modal dash-modal--wide">
            <SectionTitle>Submission: {revTarget.title}</SectionTitle>
            {subsLoading ? (
              <div className="dash-empty">Memuat...</div>
            ) : subs.length === 0 ? (
              <div className="dash-empty">Belum ada submission.</div>
            ) : (
              <div className="tugas-subs">
                {subs.map((s) => (
                  <div key={s.id} className="tugas-sub">
                    <div className="tugas-sub-head">
                      <strong>{s.student?.profile?.fullName || s.student?.username}</strong>
                      {s.isLate && <span className="tugas-badge tugas-badge--past">Terlambat</span>}
                      {s.grade !== null && <span className="tugas-badge tugas-badge--ok">Nilai {s.grade}</span>}
                    </div>
                    {s.note && <p className="tugas-sub-note">{s.note}</p>}
                    {s.fileName && (
                      <a className="tugas-attach" href={`/api/submissions/${s.id}/file`}>
                        ⬇ {s.fileName.length > 24 ? `${s.fileName.slice(0, 24)}…` : s.fileName}
                        {s.fileSize ? ` (${humanSize(s.fileSize)})` : ""}
                      </a>
                    )}
                    <p className="tugas-sub-meta">
                      {formatDateTime(s.submittedAt)}
                      {s.gradedAt && ` · dinilai ${formatDateTime(s.gradedAt)}`}
                    </p>
                    <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => openGrade(s)}>
                      {s.grade !== null ? "Ubah Nilai" : "Beri Nilai"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="dash-modal-actions">
              <button className="dash-btn dash-btn--secondary" onClick={() => setRevTarget(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GRADE */}
      {gradeTarget && (
        <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label="Beri nilai">
          <div className="dash-modal">
            <SectionTitle>Nilai: {gradeTarget.student?.profile?.fullName || gradeTarget.student?.username}</SectionTitle>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="grade-val">Nilai (0–100)</label>
              <input
                id="grade-val"
                type="number"
                min={0}
                max={100}
                className="dash-form-input"
                value={gradeVal}
                onChange={(e) => setGradeVal(e.target.value)}
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="grade-fb">Feedback</label>
              <textarea
                id="grade-fb"
                className="dash-form-textarea"
                rows={3}
                value={feedbackVal}
                onChange={(e) => setFeedbackVal(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="dash-modal-actions">
              <button className="dash-btn dash-btn--secondary" onClick={() => setGradeTarget(null)} disabled={grading}>
                Batal
              </button>
              <button className="dash-btn" onClick={handleGrade} disabled={grading || gradeVal === ""}>
                {grading ? "Menyimpan..." : "Simpan Nilai"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tugas-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .tugas-list {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          max-width: 780px;
        }
        .tugas-card { display: flex; gap: 1rem; justify-content: space-between; }
        .tugas-body { flex: 1; min-width: 0; }
        .tugas-titlerow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .tugas-title {
          font-size: 0.95rem;
          font-weight: 650;
          color: var(--color-text);
        }
        .tugas-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          white-space: nowrap;
        }
        .tugas-badge--ok { background: var(--color-success-soft); color: var(--color-success); }
        .tugas-badge--urgent { background: var(--color-warning-soft); color: var(--color-warning); }
        .tugas-badge--past { background: var(--color-danger-soft); color: var(--color-danger); }
        .tugas-desc {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          line-height: 1.6;
          margin-top: 0.375rem;
          white-space: pre-wrap;
        }
        .tugas-meta {
          font-size: 0.7rem;
          color: var(--color-text-subtle);
          margin-top: 0.5rem;
        }
        .tugas-attach {
          display: inline-block;
          font-size: 0.75rem;
          color: var(--color-accent);
          margin-top: 0.375rem;
        }
        .tugas-mysub {
          margin-top: 0.625rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-sm);
          background: var(--color-bg-alt);
        }
        .tugas-mysub-status { font-size: 0.75rem; color: var(--color-success); }
        .tugas-mysub-status--muted { color: var(--color-text-subtle); }
        .tugas-grade { font-size: 0.8rem; color: var(--color-text); margin-top: 0.25rem; }
        .tugas-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.375rem;
          flex-shrink: 0;
        }
        .tugas-fileinfo { font-size: 0.72rem; color: var(--color-text-subtle); margin-bottom: 0.75rem; }
        .tugas-fileinfo:first-child { margin-top: 0; }
        .tugas-file-remove {
          background: none;
          border: none;
          color: var(--color-danger);
          cursor: pointer;
          font-size: 0.72rem;
          padding: 0;
        }
        .tugas-subs { display: flex; flex-direction: column; gap: 0.75rem; }
        .tugas-sub {
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          padding: 0.75rem 0.875rem;
          background: var(--color-bg-alt);
        }
        .tugas-sub-head {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          font-size: 0.82rem;
        }
        .tugas-sub-note { font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.375rem; }
        .tugas-sub-meta { font-size: 0.68rem; color: var(--color-text-subtle); margin-top: 0.375rem; }
        .dash-modal--wide { max-width: 560px; }
        @media (max-width: 640px) {
          .tugas-card { flex-direction: column; }
          .tugas-actions {
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
