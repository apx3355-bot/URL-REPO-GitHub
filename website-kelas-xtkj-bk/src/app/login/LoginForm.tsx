"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldIcon, ServerIcon, UserIcon } from "@/components/Icons";

type RoleChoice = "DEVELOPER" | "WALI_KELAS" | "ANGGOTA";

const ROLES: { value: RoleChoice; label: string; Icon: typeof ShieldIcon }[] = [
  { value: "DEVELOPER", label: "Developer", Icon: ShieldIcon },
  { value: "WALI_KELAS", label: "Wali Kelas", Icon: ServerIcon },
  { value: "ANGGOTA", label: "Murid", Icon: UserIcon },
];

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleChoice | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!role) {
      setError("Pilih role terlebih dahulu.");
      return;
    }
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = "Username wajib diisi";
    if (!password) errs.password = "Password wajib diisi";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          expectedRole: role,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal. Coba lagi.");
        return;
      }

      // Role sebenarnya dari database menentukan tujuan redirect (bukan pilihan form)
      router.replace(nextPath ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ROLE SELECTOR */}
      <fieldset className="role-fieldset">
        <legend className="role-legend">Pilih Role</legend>
        <div className="role-grid" role="radiogroup" aria-label="Pilih role">
          {ROLES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={role === value}
              className={`role-card ${role === value ? "role-card--active" : ""}`}
              onClick={() => {
                setRole(value);
                setError(null);
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="form-group">
        <label className="form-label" htmlFor="username">
          Email / Username
        </label>
        <input
          id="username"
          type="text"
          className={`form-input ${fieldErrors.username ? "form-input--error" : ""}`}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          aria-invalid={!!fieldErrors.username}
        />
        {fieldErrors.username && <p className="form-error">{fieldErrors.username}</p>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className={`form-input ${fieldErrors.password ? "form-input--error" : ""}`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" className="btn-submit" disabled={loading}>
        {loading ? "Memproses..." : "MASUK"}
      </button>

      <style>{`
        .role-fieldset {
          border: none;
          margin-bottom: 1.25rem;
        }

        .role-legend {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 0.5rem;
          padding: 0;
        }

        .role-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .role-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          padding: 0.75rem 0.25rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-background);
          color: var(--color-text-muted);
          font-size: 0.72rem;
          font-weight: 550;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }

        .role-card:hover {
          border-color: var(--color-accent);
          color: var(--color-text);
        }

        .role-card--active {
          border-color: var(--color-accent);
          background: var(--color-accent-soft);
          color: var(--color-accent);
        }

        .form-group {
          margin-bottom: 1rem;
        }

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

        .form-input--error {
          border-color: var(--color-danger);
        }

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

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 360px) {
          .role-grid {
            grid-template-columns: 1fr;
          }
          .role-card {
            flex-direction: row;
            justify-content: center;
          }
        }
      `}</style>
    </form>
  );
}
