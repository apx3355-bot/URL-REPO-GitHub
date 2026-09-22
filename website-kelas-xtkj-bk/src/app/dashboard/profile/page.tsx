"use client";

import { useCallback, useEffect, useState } from "react";
import { DashCSS, SectionTitle } from "@/components/dashboard/SharedUI";
import MemberAvatar from "@/components/MemberAvatar";
import { ShieldIcon } from "@/components/Icons";

interface ProfileData {
  fullName: string;
  phone: string | null;
  bio: string | null;
  nisn: string | null;
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [me, setMe] = useState<MeData | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/auth/me"),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setProfile(data.profile);
        setForm({
          fullName: data.profile?.fullName ?? "",
          phone: data.profile?.phone ?? "",
          bio: data.profile?.bio ?? "",
        });
      } else if (pRes.status === 401) {
        window.location.href = "/login?next=/dashboard/profile";
        return;
      }
      if (mRes.ok) {
        const data = await mRes.json();
        setMe(data.user);
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
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setError(data.error || "Gagal menyimpan.");
        return;
      }
      setSuccess("Profil berhasil diperbarui.");
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header">
        <h1 className="dash-page-title">Profil Saya</h1>
        <p className="dash-page-desc">Kelola informasi profil Anda.</p>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : (
        <div className="profile-layout">
          {/* KARTU IDENTITAS — hanya data yang tersedia di DB */}
          <div className="dash-card profile-card">
            <div className="profile-identity">
              <MemberAvatar name={me?.fullName ?? "?"} size="xl" />
              <div className="profile-id-info">
                <h2 className="profile-name">{me?.fullName ?? "—"}</h2>
                <p className="profile-username">@{me?.username ?? "—"}</p>
                <div className="profile-badges">
                  <span className={`topbar-role-badge role--${(me?.role ?? "").toLowerCase()}`}>
                    <ShieldIcon size={11} /> {ROLE_LABELS[me?.role ?? ""] ?? me?.role}
                  </span>
                  <span className="topbar-role-badge role--class">Kelas X TKJ BK</span>
                </div>
              </div>
            </div>

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
            </dl>
          </div>

          {/* FORM EDIT */}
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
        </div>
      )}

      <style>{`
        .profile-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          max-width: 860px;
        }

        .profile-identity {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
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

        .profile-meta {
          border-top: 1px solid var(--color-border-light);
          padding-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .profile-meta-row {
          display: grid;
          grid-template-columns: 80px 1fr;
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
