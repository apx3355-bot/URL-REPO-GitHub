"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashCSS, SectionTitle } from "@/components/dashboard/SharedUI";
import AvatarDisplay from "@/components/AvatarDisplay";
import { processAvatarFile } from "@/lib/avatarClient";

interface ProfileData {
  fullName: string;
  phone: string | null;
  bio: string | null;
  nisn: string | null;
  photo: string | null;
  updatedAt: string;
}

interface MeData {
  username: string;
  role: string;
  fullName: string;
}

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: "Developer",
  WALI_KELAS: "Wali Kelas",
  ANGGOTA: "Anggota",
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [me, setMe] = useState<MeData | null>(null);
  const [form, setForm] = useState({ fullName: "", username: "", phone: "", bio: "" });
  // undefined = tidak ada perubahan foto; "" = hapus foto; data URL = ganti foto
  const [pendingPhoto, setPendingPhoto] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/auth/me"),
      ]);
      if (pRes.status === 401 || mRes.status === 401) {
        window.location.href = "/login?next=/dashboard/profile";
        return;
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setProfile(data.profile);
        setForm((f) => ({
          ...f,
          fullName: data.profile?.fullName ?? "",
          phone: data.profile?.phone ?? "",
          bio: data.profile?.bio ?? "",
        }));
      }
      if (mRes.ok) {
        const data = await mRes.json();
        setMe(data.user);
        setForm((f) => ({ ...f, username: data.user?.username ?? "" }));
      }
    } catch {
      setError("Tidak dapat memuat profil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(pendingPhoto !== undefined ? { photo: pendingPhoto } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setError(data.error || "Gagal menyimpan.");
        return;
      }
      const usernameChanged = data.username && data.username !== me?.username;
      setSuccess(
        usernameChanged
          ? `Profil tersimpan. Username baru: @${data.username} — gunakan username ini saat login berikutnya.`
          : "Profil berhasil diperbarui."
      );
      setPendingPhoto(undefined);
      // Refresh server components (layout topbar menampilkan nama/avatar dari session)
      router.refresh();
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset agar file yang sama bisa dipilih ulang
    if (!file) return;
    const result = await processAvatarFile(file);
    if (result.ok) {
      setPendingPhoto(result.dataUrl);
      setError(null);
    } else {
      setError(result.message);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(false);
    setPwErrors({});
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pw.current,
          newPassword: pw.next,
          confirmPassword: pw.confirm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setPwErrors(data.fields);
        setPwError(data.error || "Gagal mengubah password.");
        return;
      }
      // tokenVersion naik → session invalid → login ulang otomatis dipaksa
      setPwSuccess(true);
      setPw({ current: "", next: "", confirm: "" });
      setTimeout(() => {
        window.location.replace("/login");
      }, 1800);
    } catch {
      setPwError("Tidak dapat terhubung ke server.");
    } finally {
      setPwSaving(false);
    }
  }

  const displayPhoto = pendingPhoto !== undefined ? pendingPhoto : profile?.photo ?? null;
  const hasPhoto = Boolean(displayPhoto);

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header">
        <h1 className="dash-page-title">Profil Saya</h1>
        <p className="dash-page-desc">Kelola identitas, avatar, dan keamanan akun Anda.</p>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : (
        <div className="profile-layout">
          {/* KARTU IDENTITAS + AVATAR */}
          <div className="dash-card profile-card">
            <div className="profile-identity">
              <div className="profile-avatar-wrap">
                <AvatarDisplay name={me?.fullName ?? "?"} photo={displayPhoto} size="xl" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarFile}
                  className="profile-avatar-input"
                  aria-label="Pilih foto profil"
                />
              </div>
              <div className="profile-id-info">
                <h2 className="profile-name">{me?.fullName ?? "—"}</h2>
                <p className="profile-username">@{me?.username ?? "—"}</p>
                <div className="profile-badges">
                  <span className={`topbar-role-badge role--${(me?.role ?? "").toLowerCase()}`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    {ROLE_LABELS[me?.role ?? ""] ?? me?.role}
                  </span>
                  <span className="topbar-role-badge role--class">Kelas X TKJ BK</span>
                </div>
              </div>
            </div>

            <div className="profile-avatar-actions">
              <button
                type="button"
                className="dash-btn dash-btn--secondary dash-btn--sm profile-avatar-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                {hasPhoto ? "Ganti Foto" : "Unggah Foto"}
              </button>
              {hasPhoto && (
                <button
                  type="button"
                  className="dash-btn dash-btn--secondary dash-btn--sm profile-avatar-btn profile-avatar-btn--danger"
                  onClick={() => setPendingPhoto("")}
                  disabled={saving}
                >
                  Hapus Foto
                </button>
              )}
            </div>
            <p className="profile-avatar-hint">
              JPG, PNG, atau WEBP — otomatis di-crop lingkaran &amp; dikompres. Maks 8 MB.
              Perubahan foto diterapkan saat Anda menekan &ldquo;Simpan Perubahan&rdquo;.
            </p>

            <dl className="profile-meta">
              {profile?.nisn && (
                <div className="profile-meta-row">
                  <dt>NISN</dt>
                  <dd>{profile.nisn}</dd>
                </div>
              )}
              {profile?.phone && (
                <div className="profile-meta-row">
                  <dt>Kontak</dt>
                  <dd>{profile.phone}</dd>
                </div>
              )}
              {profile?.updatedAt && (
                <div className="profile-meta-row">
                  <dt>Diperbarui</dt>
                  <dd>
                    {new Date(profile.updatedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* FORM EDIT PROFIL */}
          <div className="dash-card">
            <SectionTitle>Edit Profil</SectionTitle>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="p-name">Nama Lengkap</label>
              <input
                id="p-name"
                className="dash-form-input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                maxLength={100}
              />
              {fieldErrors.fullName && <p className="dash-form-error">{fieldErrors.fullName}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="p-username">Username</label>
              <input
                id="p-username"
                className="dash-form-input dash-form-input--mono"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                maxLength={32}
                autoComplete="username"
              />
              <p className="dash-form-hint">
                3–32 karakter; huruf, angka, titik, underscore. Username dipakai untuk login.
              </p>
              {fieldErrors.username && <p className="dash-form-error">{fieldErrors.username}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="p-phone">Nomor Telepon (opsional)</label>
              <input
                id="p-phone"
                className="dash-form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08xx-xxxx-xxxx"
                inputMode="tel"
              />
              {fieldErrors.phone && <p className="dash-form-error">{fieldErrors.phone}</p>}
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="p-bio">Bio (opsional)</label>
              <textarea
                id="p-bio"
                className="dash-form-textarea"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={300}
              />
              {fieldErrors.bio && <p className="dash-form-error">{fieldErrors.bio}</p>}
            </div>
            <button className="dash-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>

          {/* GANTI PASSWORD */}
          <div className="dash-card profile-pw-card">
            <SectionTitle>Ganti Password</SectionTitle>
            <form onSubmit={handleChangePassword}>
              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="pw-current">Password Saat Ini</label>
                <input
                  id="pw-current"
                  type="password"
                  className="dash-form-input"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  autoComplete="current-password"
                />
                {pwErrors.currentPassword && <p className="dash-form-error">{pwErrors.currentPassword}</p>}
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="pw-next">Password Baru</label>
                <input
                  id="pw-next"
                  type="password"
                  className="dash-form-input"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  autoComplete="new-password"
                  minLength={8}
                />
                <p className="dash-form-hint">Minimal 8 karakter.</p>
                {pwErrors.newPassword && <p className="dash-form-error">{pwErrors.newPassword}</p>}
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="pw-confirm">Konfirmasi Password Baru</label>
                <input
                  id="pw-confirm"
                  type="password"
                  className="dash-form-input"
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  autoComplete="new-password"
                />
                {pwErrors.confirmPassword && <p className="dash-form-error">{pwErrors.confirmPassword}</p>}
              </div>
              {pwError && <p className="dash-form-error" role="alert">{pwError}</p>}
              {pwSuccess && (
                <p className="dash-alert dash-alert--success" role="status">
                  Password berhasil diubah. Mengalihkan ke halaman login...
                </p>
              )}
              <button type="submit" className="dash-btn" disabled={pwSaving}>
                {pwSaving ? "Mengubah..." : "Ubah Password"}
              </button>
              <p className="profile-pw-note">
                Setelah password diubah, semua sesi (termasuk perangkat lain) akan keluar otomatis
                dan Anda harus login ulang dengan password baru.
              </p>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .profile-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          max-width: 860px;
        }

        .profile-pw-card {
          grid-column: 1 / -1;
          max-width: 520px;
        }

        .profile-identity {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-bottom: 1rem;
        }

        .profile-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .profile-avatar-input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .profile-id-info {
          min-width: 0;
        }

        .profile-name {
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text);
        }

        .profile-username {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-subtle);
          margin: 0.125rem 0 0.625rem;
        }

        .profile-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .topbar-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0.1875rem 0.5rem;
          border-radius: 999px;
        }

        .role--developer { background: var(--color-accent-soft); color: var(--color-accent); }
        .role--wali_kelas { background: var(--color-warning-soft); color: var(--color-warning); }
        .role--anggota { background: var(--color-success-soft); color: var(--color-success); }
        .role--class { background: var(--color-border-light); color: var(--color-text-muted); }

        .profile-avatar-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .profile-avatar-btn {
          font-size: 0.78rem;
          padding: 0.375rem 0.75rem;
        }

        .profile-avatar-btn--danger:hover {
          border-color: var(--color-danger);
          color: var(--color-danger);
        }

        .profile-avatar-hint {
          font-size: 0.72rem;
          color: var(--color-text-subtle);
          line-height: 1.5;
          margin: 0.5rem 0 0;
        }

        .profile-meta {
          border-top: 1px solid var(--color-border-light);
          padding-top: 1rem;
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .profile-meta-row {
          display: grid;
          grid-template-columns: 90px 1fr;
          gap: 0.75rem;
          font-size: 0.825rem;
        }

        .profile-meta-row dt {
          color: var(--color-text-subtle);
        }

        .profile-meta-row dd {
          color: var(--color-text);
          font-weight: 500;
        }

        .dash-form-input--mono {
          font-family: var(--font-mono);
        }

        .dash-form-hint {
          font-size: 0.72rem;
          color: var(--color-text-subtle);
          margin: 0.25rem 0 0;
        }

        .profile-pw-note {
          font-size: 0.75rem;
          color: var(--color-text-subtle);
          line-height: 1.55;
          margin-top: 0.875rem;
          padding: 0.625rem 0.75rem;
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-sm);
          background: rgba(148,163,184,0.05);
        }

        @media (min-width: 768px) {
          .profile-layout {
            grid-template-columns: 1fr 1.4fr;
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}
