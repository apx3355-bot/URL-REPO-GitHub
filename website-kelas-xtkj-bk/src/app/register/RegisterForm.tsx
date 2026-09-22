"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface RegStatus {
  registrationOpen: boolean;
  quota: { max: number; registered: number; remaining: number; full: boolean };
}

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
    nisn: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<RegStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Status registrasi & kuota — supaya UI tidak menampilkan form yang pasti ditolak server.
  useEffect(() => {
    fetch("/api/register-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d))
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        setError(data.error || "Pendaftaran gagal.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  if (statusLoading) {
    return (
      <div className="reg-status" role="status">
        Memuat...
      </div>
    );
  }

  if (status && !status.registrationOpen) {
    return (
      <div className="reg-status reg-status--closed" role="alert">
        ✕ Pendaftaran akun baru sedang ditutup.
      </div>
    );
  }

  if (status && status.quota.full) {
    return (
      <div className="reg-status reg-status--closed" role="alert">
        ✕ Kuota anggota kelas saat ini sudah penuh ({status.quota.registered}/{status.quota.max}).
      </div>
    );
  }

  if (success) {
    return (
      <div className="alert alert--success" role="status">
        ✓ Pendaftaran berhasil! Mengalihkan ke halaman masuk...
        <style>{`
          .alert--success {
            padding: 0.75rem 0.875rem;
            border-radius: var(--radius-md);
            font-size: 0.85rem;
            background: var(--color-success-soft);
            border: 1px solid var(--color-success);
            color: var(--color-success);
          }
        `}</style>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {[
        { id: "reg-name", label: "Nama Lengkap", key: "fullName" as const, type: "text", autoComplete: "name", maxLength: 100 },
        { id: "reg-username", label: "Username", key: "username" as const, type: "text", autoComplete: "username", maxLength: 32 },
        { id: "reg-password", label: "Password (min. 8 karakter)", key: "password" as const, type: "password", autoComplete: "new-password", maxLength: 128 },
        { id: "reg-confirm", label: "Konfirmasi Password", key: "confirmPassword" as const, type: "password", autoComplete: "new-password", maxLength: 128 },
        { id: "reg-nisn", label: "NISN (opsional)", key: "nisn" as const, type: "text", autoComplete: "off", maxLength: 10 },
      ].map((f) => (
        <div className="form-group" key={f.id}>
          <label className="form-label" htmlFor={f.id}>{f.label}</label>
          <input
            id={f.id}
            type={f.type}
            className={`form-input ${fieldErrors[f.key] ? "form-input--error" : ""}`}
            value={form[f.key]}
            onChange={set(f.key)}
            autoComplete={f.autoComplete}
            maxLength={f.maxLength}
            inputMode={f.key === "nisn" ? "numeric" : undefined}
            aria-invalid={!!fieldErrors[f.key]}
          />
          {fieldErrors[f.key] && <p className="form-error">{fieldErrors[f.key]}</p>}
        </div>
      ))}

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" className="btn-submit" disabled={loading}>
        {loading ? "Mendaftarkan..." : "DAFTAR"}
      </button>

      <style>{`
        .form-group { margin-bottom: 1rem; }
        .form-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 0.375rem;
        }
        .form-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          background: var(--color-background);
          color: var(--color-text);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .form-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-soft);
        }
        .form-input--error { border-color: var(--color-danger); }
        .form-error {
          font-size: 0.75rem;
          color: var(--color-danger);
          margin-top: 0.25rem;
        }
        .alert {
          padding: 0.625rem 0.875rem;
          border-radius: var(--radius-md);
          font-size: 0.825rem;
          margin-bottom: 1rem;
        }
        .alert--error {
          background: var(--color-danger-soft);
          border: 1px solid var(--color-danger);
          color: var(--color-danger);
        }
        .btn-submit {
          width: 100%;
          padding: 0.625rem;
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 650;
          letter-spacing: 0.05em;
          transition: background 0.15s, transform 0.15s;
        }
        .btn-submit:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .reg-status {
          padding: 1rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          line-height: 1.5;
          background: var(--color-surface, var(--color-background));
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
        }

        .reg-status--closed {
          background: var(--color-warning-soft);
          border: 1px solid var(--color-warning);
          color: var(--color-warning);
        }
      `}</style>
    </form>
  );
}
