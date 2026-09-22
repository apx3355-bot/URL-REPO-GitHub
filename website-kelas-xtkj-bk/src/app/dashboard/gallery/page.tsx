"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashCSS } from "@/components/dashboard/SharedUI";

interface GalleryItem {
  id: number;
  imagePath: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  userId: number;
  user?: { username: string; profile: { fullName: string } | null } | null;
}

interface Me {
  id: number;
  role: "DEVELOPER" | "WALI_KELAS" | "ANGGOTA";
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Moderasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export default function GalleryPage() {
  const [mine, setMine] = useState<GalleryItem[]>([]);
  const [queue, setQueue] = useState<GalleryItem[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isModerator = me?.role === "DEVELOPER" || me?.role === "WALI_KELAS";
  const canUpload = me?.role === "DEVELOPER" || me?.role === "ANGGOTA";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, mineRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/gallery?mine=1"),
      ]);
      if (meRes.ok) {
        const data = await meRes.json();
        setMe(data.user);
      }
      if (mineRes.ok) {
        const data = await mineRes.json();
        setMine(data.items);
      } else if (mineRes.status === 401) {
        window.location.href = "/login?next=/dashboard/gallery";
        return;
      }
      // Moderators load queue
      const modRes = await fetch("/api/gallery/moderation");
      if (modRes.ok) {
        const data = await modRes.json();
        setQueue(data.items);
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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Pilih file foto terlebih dahulu.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("title", form.title);
      fd.append("description", form.description);
      const res = await fetch("/api/gallery", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.fields?.file || data.error || "Upload gagal.");
        return;
      }
      setSuccess("Foto terkirim dan menunggu moderasi.");
      setShowUpload(false);
      setForm({ title: "", description: "" });
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setUploading(false);
    }
  }

  async function handleModerate(id: number, action: "approve" | "reject") {
    setModerating(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses moderasi.");
        return;
      }
      setSuccess(action === "approve" ? "Foto disetujui dan tampil di galeri publik." : "Foto ditolak.");
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setModerating(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus foto ini?")) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menghapus.");
        return;
      }
      setSuccess("Foto dihapus.");
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    }
  }

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="dash-page-title">Galeri Kelas</h1>
          <p className="dash-page-desc">
            {isModerator
              ? "Moderasi foto yang diunggah murid."
              : "Unggah foto kegiatan kelas. Foto tampil publik setelah disetujui."}
          </p>
        </div>
        {canUpload && (
          <button className="dash-btn" onClick={() => setShowUpload(true)}>+ Tambahkan Foto</button>
        )}
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : (
        <>
          {/* QUEUE MODERASI */}
          {isModerator && (
            <div className="dash-section" style={{ marginBottom: "2.5rem" }}>
              <h2 className="dash-section-title">Menunggu Moderasi ({queue.length})</h2>
              {queue.length === 0 ? (
                <div className="dash-empty">Tidak ada foto yang menunggu moderasi. ✓</div>
              ) : (
                <div className="mod-grid">
                  {queue.map((item) => (
                    <div key={item.id} className="mod-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imagePath} alt={item.title} className="mod-img" loading="lazy" />
                      <div className="mod-info">
                        <p className="mod-title">{item.title}</p>
                        {item.description && <p className="mod-desc">{item.description}</p>}
                        <p className="mod-meta">oleh {item.user?.profile?.fullName ?? item.user?.username ?? "—"}</p>
                        <div className="mod-actions">
                          <button
                            className="dash-btn dash-btn--sm"
                            onClick={() => handleModerate(item.id, "approve")}
                            disabled={moderating === item.id}
                          >
                            ✓ Setujui
                          </button>
                          <button
                            className="dash-btn dash-btn--danger dash-btn--sm"
                            onClick={() => handleModerate(item.id, "reject")}
                            disabled={moderating === item.id}
                          >
                            ✕ Tolak
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FOTO SAYA */}
          <div className="dash-section">
            <h2 className="dash-section-title">
              {isModerator ? "Foto Saya" : "Foto Saya di Galeri"}
            </h2>
            {mine.length === 0 ? (
              <div className="dash-empty">
                Belum ada foto. {canUpload && "Klik \"+ Tambahkan Foto\" untuk mengunggah."}
              </div>
            ) : (
              <div className="mod-grid">
                {mine.map((item) => (
                  <div key={item.id} className="mod-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imagePath} alt={item.title} className="mod-img" loading="lazy" />
                    <div className="mod-info">
                      <p className="mod-title">{item.title}</p>
                      <span className={`dash-status dash-status--${item.status.toLowerCase()}`}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                      <div className="mod-actions">
                        <button className="dash-btn dash-btn--secondary dash-btn--sm" onClick={() => handleDelete(item.id)}>
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL UPLOAD */}
      {showUpload && (
        <div className="dash-modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="dash-modal-title">Tambahkan Foto</h2>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="g-file">File Foto (JPG/PNG/WEBP, maks 5 MB)</label>
              <input
                id="g-file"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="dash-form-input"
                onChange={onFileChange}
              />
            </div>
            {previewUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="Preview" className="upload-preview" />
            )}
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="g-title">Judul</label>
              <input
                id="g-title"
                className="dash-form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="g-desc">Deskripsi (opsional)</label>
              <textarea
                id="g-desc"
                className="dash-form-textarea"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={300}
              />
            </div>
            <div className="dash-modal-actions">
              <button className="dash-btn dash-btn--secondary" onClick={() => setShowUpload(false)}>Batal</button>
              <button className="dash-btn" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Mengunggah..." : "Unggah"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mod-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.875rem;
        }
        .mod-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .mod-img {
          width: 100%;
          aspect-ratio: 4/3;
          object-fit: cover;
          background: var(--color-bg-alt);
        }
        .mod-info {
          padding: 0.75rem 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .mod-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text);
        }
        .mod-desc {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .mod-meta {
          font-size: 0.7rem;
          color: var(--color-text-subtle);
        }
        .mod-actions {
          display: flex;
          gap: 0.375rem;
          margin-top: 0.375rem;
        }
        .upload-preview {
          width: 100%;
          max-height: 200px;
          object-fit: contain;
          border-radius: var(--radius-md);
          margin-bottom: 0.875rem;
          background: var(--color-bg-alt);
        }
        @media (min-width: 640px) {
          .mod-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </div>
  );
}
