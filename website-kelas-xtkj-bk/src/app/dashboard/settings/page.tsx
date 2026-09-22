"use client";

import { useCallback, useEffect, useState } from "react";
import { DashCSS } from "@/components/dashboard/SharedUI";

interface SettingsData {
  memberQuotaMax: number;
  registrationOpen: boolean;
}

interface QuotaInfo {
  max: number;
  registered: number;
  remaining: number;
  full: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        // Kuota ambil dari statistik dashboard (endpoint sama, resource settings+stats)
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.quota) setQuota(statsData.quota);
        }
      } else if (res.status === 403) {
        setForbidden(true);
      } else if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/settings";
        return;
      } else {
        setError("Gagal memuat pengaturan.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setConfirmSave(false);
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberQuotaMax: settings.memberQuotaMax,
          registrationOpen: settings.registrationOpen,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan pengaturan.");
        return;
      }
      setSuccess(data.message || "Pengaturan tersimpan.");
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <div>
        <DashCSS />
        <div className="dash-page-header">
          <h1 className="dash-page-title">Settings</h1>
        </div>
        <div className="dash-empty">Hanya Developer yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div>
        <DashCSS />
        <div className="dash-empty">Memuat pengaturan...</div>
      </div>
    );
  }

  const quotaPct = quota ? Math.min(100, Math.round((quota.registered / quota.max) * 100)) : 0;

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header">
        <h1 className="dash-page-title">Settings</h1>
        <p className="dash-page-desc">
          Konfigurasi website. Secret (API key, password, token) tidak dikelola di sini —
          tetap di environment variables server.
        </p>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {/* KUOTA ANGGOTA */}
      <section className="settings-section">
        <h2 className="settings-heading">Kuota Anggota</h2>
        {quota && (
          <div className="settings-quota-card">
            <div className="settings-quota-nums">
              <div><strong>{quota.max}</strong><span>Maksimum</span></div>
              <div><strong>{quota.registered}</strong><span>Terdaftar</span></div>
              <div><strong>{quota.remaining}</strong><span>Sisa</span></div>
              <div>
                <strong className={quota.full ? "settings-quota-full" : "settings-quota-ok"}>
                  {quota.full ? "PENUH" : "TERBUKA"}
                </strong>
                <span>Status</span>
              </div>
            </div>
            <div className="settings-quota-bar" role="progressbar" aria-valuenow={quotaPct} aria-valuemin={0} aria-valuemax={100} aria-label="Terpakai kuota anggota">
              <div
                className={`settings-quota-bar-fill ${quota.full ? "settings-quota-bar-fill--full" : ""}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            <p className="settings-quota-note">
              {quotaPct}% kuota terpakai. Pendaftaran murid baru otomatis ditolak saat kuota penuh.
            </p>
          </div>
        )}

        <label className="settings-label" htmlFor="quota-max">
          Maximum Member Quota
        </label>
        <input
          id="quota-max"
          type="number"
          min={1}
          max={500}
          className="dash-input settings-input"
          value={settings.memberQuotaMax}
          onChange={(e) =>
            setSettings({ ...settings, memberQuotaMax: Number(e.target.value) })
          }
          disabled={saving}
        />
        <p className="settings-hint">1–500. Perubahan berlaku langsung untuk pendaftaran baru.</p>
      </section>

      {/* REGISTRASI */}
      <section className="settings-section">
        <h2 className="settings-heading">Registrasi Publik</h2>
        <div className="settings-toggle-row">
          <div>
            <p className="settings-toggle-title">Buka pendaftaran akun Murid</p>
            <p className="settings-hint">
              Registrasi publik selalu membuat akun Murid — tidak bisa Developer/Wali Kelas.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.registrationOpen}
            aria-label="Registrasi publik"
            className={`settings-switch ${settings.registrationOpen ? "settings-switch--on" : ""}`}
            onClick={() =>
              setSettings({ ...settings, registrationOpen: !settings.registrationOpen })
            }
            disabled={saving}
          >
            <span className="settings-switch-knob" />
          </button>
        </div>
        <p className={`settings-state ${settings.registrationOpen ? "settings-state--open" : "settings-state--closed"}`}>
          {settings.registrationOpen ? "✓ Pendaftaran terbuka" : "✕ Pendaftaran ditutup"}
        </p>
      </section>

      <div className="settings-actions">
        <button
          className="dash-btn dash-btn--primary"
          onClick={() => setConfirmSave(true)}
          disabled={saving}
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>

      {/* Konfirmasi simpan */}
      {confirmSave && (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Konfirmasi simpan pengaturan">
          <div className="settings-modal">
            <h3 className="settings-modal-title">Simpan perubahan?</h3>
            <p className="settings-modal-text">
              Kuota: <strong>{settings.memberQuotaMax}</strong> · Registrasi:{" "}
              <strong>{settings.registrationOpen ? "terbuka" : "ditutup"}</strong>. Semua perubahan
              tercatat di Activity Log.
            </p>
            <div className="settings-modal-actions">
              <button className="dash-btn" onClick={() => setConfirmSave(false)} disabled={saving}>
                Batal
              </button>
              <button className="dash-btn dash-btn--primary" onClick={save} disabled={saving}>
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .settings-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .settings-heading {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 1rem;
        }

        .settings-quota-card {
          margin-bottom: 1.25rem;
        }

        .settings-quota-nums {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.875rem;
        }

        .settings-quota-nums > div {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .settings-quota-nums strong {
          font-size: 1.15rem;
          color: var(--color-text);
        }

        .settings-quota-nums span {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
        }

        .settings-quota-full { color: var(--color-danger); }
        .settings-quota-ok { color: var(--color-success); }

        .settings-quota-bar {
          height: 8px;
          border-radius: 999px;
          background: var(--color-border);
          overflow: hidden;
        }

        .settings-quota-bar-fill {
          height: 100%;
          background: var(--color-accent);
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .settings-quota-bar-fill--full {
          background: var(--color-danger);
        }

        .settings-quota-note {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .settings-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 0.375rem;
        }

        .settings-input {
          max-width: 180px;
        }

        .settings-hint {
          font-size: 0.72rem;
          color: var(--color-text-muted);
          margin-top: 0.375rem;
        }

        .settings-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .settings-toggle-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .settings-switch {
          position: relative;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
          border-radius: 999px;
          background: var(--color-border);
          transition: background 0.15s;
        }

        .settings-switch--on {
          background: var(--color-success);
        }

        .settings-switch-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.15s;
        }

        .settings-switch--on .settings-switch-knob {
          transform: translateX(20px);
        }

        .settings-state {
          margin-top: 0.75rem;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .settings-state--open { color: var(--color-success); }
        .settings-state--closed { color: var(--color-danger); }

        .settings-actions {
          display: flex;
          justify-content: flex-end;
        }

        .settings-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 300;
        }

        .settings-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 310;
          width: min(380px, calc(100vw - 2rem));
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          animation: settingsModalIn 0.15s ease;
        }

        @keyframes settingsModalIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }

        .settings-modal-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .settings-modal-text {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          line-height: 1.55;
          margin-bottom: 1.25rem;
        }

        .settings-modal-actions {
          display: flex;
          gap: 0.625rem;
          justify-content: flex-end;
        }

        @media (max-width: 560px) {
          .settings-quota-nums {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
