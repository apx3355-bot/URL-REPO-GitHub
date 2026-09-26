"use client";

import { useCallback, useEffect, useState } from "react";
import { DashCSS, formatDate } from "@/components/dashboard/SharedUI";

interface AppUser {
  id: number;
  username: string;
  role: "DEVELOPER" | "WALI_KELAS" | "ANGGOTA";
  isActive: boolean;
  inactiveReason: string | null;
  inactiveAt: string | null;
  createdAt: string;
  profile: { fullName: string; nisn: string | null } | null;
}

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: "Developer",
  WALI_KELAS: "Wali Kelas",
  ANGGOTA: "Murid",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", username: "", password: "", role: "WALI_KELAS" });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Reset password
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Confirm role change / deactivate
  const [pendingChange, setPendingChange] = useState<{ userId: number; payload: { role?: string; isActive?: boolean; reason?: string }; label: string } | null>(null);
  // Soft-delete: modal alasan penonaktifan
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [meId, setMeId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // id akun sendiri (backend juga memblok self-degrade)
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((d) => setMeId(d?.user?.id ?? null)).catch(() => {});
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else if (res.status === 403) {
        setForbidden(true);
      } else if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/users";
        return;
      }
    } catch {
      setError("Tidak dapat memuat data.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function sendUpdate(userId: number, payload: { role?: string; isActive?: boolean; reason?: string; newPassword?: string }) {
    setBusy(userId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memperbarui user.");
        return false;
      }
      setSuccess("Perubahan tersimpan.");
      load();
      return true;
    } catch {
      setError("Tidak dapat terhubung ke server.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreateErrors({});
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setCreateErrors(data.fields);
        setError(data.error || "Gagal membuat akun.");
        return;
      }
      setSuccess(`Akun ${ROLE_LABELS[newUser.role]} @${newUser.username} berhasil dibuat.`);
      setShowCreate(false);
      setNewUser({ fullName: "", username: "", password: "", role: "WALI_KELAS" });
      load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);
    const ok = await sendUpdate(resetTarget.id, { newPassword: resetPassword });
    if (ok) {
      setResetTarget(null);
      setResetPassword("");
    }
  }

  async function submitDeactivate(e: React.FormEvent) {
    e.preventDefault();
    if (!deactivateTarget) return;
    setError(null);
    setSuccess(null);
    setDeactivateError(null);
    const res = await sendUpdate(deactivateTarget.id, {
      isActive: false,
      reason: deactivateReason.trim(),
    });
    if (res) {
      setDeactivateTarget(null);
      setDeactivateReason("");
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteTarget) return;
    setBusy(deleteTarget.id);
    setError(null);
    setSuccess(null);
    setDeleteError(null);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id, confirmUsername: deleteConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.fields?.confirmUsername || data.error || "Gagal menghapus akun.");
        return;
      }
      setSuccess(data.message || "Akun dihapus.");
      setDeleteTarget(null);
      setDeleteConfirm("");
      load();
    } catch {
      setDeleteError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(null);
    }
  }

  if (forbidden) {
    return (
      <div>
        <DashCSS />
        <div className="dash-page-header">
          <h1 className="dash-page-title">User Management</h1>
        </div>
        <div className="dash-empty">Hanya Developer yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header">
        <h1 className="dash-page-title">User Management</h1>
        <p className="dash-page-desc">
          Kelola akun & role. {users.length} akun ditampilkan. Password tidak pernah ditampilkan.
        </p>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}
      {success && <div className="dash-alert dash-alert--success">{success}</div>}

      {/* Toolbar: search + filter + create */}
      <div className="users-toolbar">
        <input
          type="search"
          className="dash-input users-search"
          placeholder="Cari nama atau username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari user"
        />
        <select
          className="dash-input users-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter role"
        >
          <option value="">Semua role</option>
          <option value="DEVELOPER">Developer</option>
          <option value="WALI_KELAS">Wali Kelas</option>
          <option value="ANGGOTA">Murid</option>
        </select>
        <select
          className="dash-input users-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button className="dash-btn dash-btn--primary users-create-btn" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Tutup" : "+ Buat Akun"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form className="users-create-form" onSubmit={createAccount}>
          <h2 className="users-form-title">Buat Akun Baru</h2>
          <p className="users-form-hint">
            Jalur resmi pembuatan akun Wali Kelas & Developer (registrasi publik hanya untuk Murid).
          </p>
          <div className="users-form-grid">
            <div>
              <label className="users-label" htmlFor="nu-name">Nama lengkap</label>
              <input id="nu-name" className="dash-input" value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} required />
              {createErrors.fullName && <p className="users-field-error">{createErrors.fullName}</p>}
            </div>
            <div>
              <label className="users-label" htmlFor="nu-username">Username</label>
              <input id="nu-username" className="dash-input" value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
              {createErrors.username && <p className="users-field-error">{createErrors.username}</p>}
            </div>
            <div>
              <label className="users-label" htmlFor="nu-password">Password awal</label>
              <input id="nu-password" type="password" className="dash-input" value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={8} />
              {createErrors.password && <p className="users-field-error">{createErrors.password}</p>}
            </div>
            <div>
              <label className="users-label" htmlFor="nu-role">Role</label>
              <select id="nu-role" className="dash-input" value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="WALI_KELAS">Wali Kelas</option>
                <option value="DEVELOPER">Developer</option>
                <option value="ANGGOTA">Murid</option>
              </select>
            </div>
          </div>
          <button type="submit" className="dash-btn dash-btn--primary users-form-submit">
            Buat Akun
          </button>
        </form>
      )}

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : users.length === 0 ? (
        <div className="dash-empty">Tidak ada user yang cocok dengan filter.</div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.profile?.fullName ?? "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>@{u.username}</td>
                  <td>
                    <select
                      className="dash-form-select"
                      style={{ minWidth: "110px", padding: "0.25rem 0.5rem" }}
                      value={u.role}
                      onChange={(e) =>
                        setPendingChange({
                          userId: u.id,
                          payload: { role: e.target.value },
                          label: `ubah role @${u.username} menjadi ${ROLE_LABELS[e.target.value]}?`,
                        })
                      }
                      disabled={busy === u.id}
                      aria-label={`Role untuk ${u.username}`}
                    >
                      <option value="DEVELOPER">Developer</option>
                      <option value="WALI_KELAS">Wali Kelas</option>
                      <option value="ANGGOTA">Murid</option>
                    </select>
                  </td>
                  <td>
                    <span className={`dash-status ${u.isActive ? "dash-status--published" : "dash-status--archived"}`}>
                      {u.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                    {!u.isActive && u.inactiveReason && (
                      <span className="users-inactive-reason" title={u.inactiveAt ? new Date(u.inactiveAt).toLocaleString("id-ID") : undefined}>
                        {u.inactiveReason}
                      </span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="users-actions">
                      <button
                        className="dash-btn dash-btn--sm"
                        onClick={() => { setResetTarget(u); setResetError(null); }}
                        disabled={busy === u.id}
                      >
                        Reset Password
                      </button>
                      {u.isActive ? (
                        <button
                          className="dash-btn dash-btn--sm dash-btn--danger"
                          onClick={() => { setDeactivateTarget(u); setDeactivateReason(""); setDeactivateError(null); }}
                          disabled={busy === u.id || u.id === meId}
                          title={u.id === meId ? "Tidak dapat menonaktifkan akun Anda sendiri" : "Nonaktifkan dengan alasan"}
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <button
                          className="dash-btn dash-btn--sm"
                          onClick={() =>
                            setPendingChange({
                              userId: u.id,
                              payload: { isActive: true },
                              label: `mengaktifkan kembali akun @${u.username}?`,
                            })
                          }
                          disabled={busy === u.id}
                        >
                          Aktifkan
                        </button>
                      )}
                      <button
                        className="dash-btn dash-btn--sm dash-btn--danger users-delete-btn"
                        onClick={() => { setDeleteTarget(u); setDeleteConfirm(""); setDeleteError(null); }}
                        disabled={busy === u.id || (u.role === "DEVELOPER" && users.filter((x) => x.role === "DEVELOPER" && x.isActive).length <= 1)}
                        title={u.role === "DEVELOPER" && users.filter((x) => x.role === "DEVELOPER" && x.isActive).length <= 1 ? "Tidak dapat menghapus satu-satunya akun Developer" : "Hapus akun permanen"}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal reset password */}
      {resetTarget && (
        <div className="users-overlay" role="dialog" aria-modal="true" aria-label="Reset password">
          <form className="users-modal" onSubmit={submitReset}>
            <h3 className="users-modal-title">Reset password @{resetTarget.username}</h3>
            <p className="users-modal-text">
              Password baru minimal 8 karakter. Semua sesi aktif user ini akan otomatis logout.
              Password tidak pernah ditampilkan kembali.
            </p>
            {resetError && <div className="dash-alert dash-alert--error" role="alert">{resetError}</div>}
            <input
              type="password"
              className="dash-input"
              placeholder="Password baru"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              required
              minLength={8}
              aria-label="Password baru"
            />
            <div className="users-modal-actions">
              <button type="button" className="dash-btn" onClick={() => setResetTarget(null)}>
                Batal
              </button>
              <button type="submit" className="dash-btn dash-btn--primary">Reset</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal konfirmasi perubahan role/status */}
      {pendingChange && (
        <div className="users-overlay" role="dialog" aria-modal="true" aria-label="Konfirmasi perubahan">
          <div className="users-modal">
            <h3 className="users-modal-title">Konfirmasi</h3>
            <p className="users-modal-text">Yakin ingin {pendingChange.label}</p>
            <div className="users-modal-actions">
              <button className="dash-btn" onClick={() => setPendingChange(null)}>Batal</button>
              <button
                className="dash-btn dash-btn--primary"
                onClick={async () => {
                  const c = pendingChange;
                  setPendingChange(null);
                  await sendUpdate(c.userId, c.payload);
                }}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nonaktif dengan alasan — soft-delete */}
      {deactivateTarget && (
        <div className="users-overlay" role="dialog" aria-modal="true" aria-label="Nonaktifkan akun">
          <form className="users-modal" onSubmit={submitDeactivate}>
            <h3 className="users-modal-title">Nonaktifkan @{deactivateTarget.username}</h3>
            <p className="users-modal-text">
              Akun tetap tersimpan beserta seluruh datanya dan dapat diaktifkan kembali
              kapan saja. Semua sesi aktifnya akan logout. Hapus permanen hanya untuk
              konten yang benar-benar tidak diperlukan.
            </p>
            <p className="users-modal-text users-modal-warning">Alasan penonaktifan (tampil di tabel):</p>
            <input
              className="dash-input"
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              placeholder="cth: melanggar aturan kelas / bukan anggota kelas / duplikat akun"
              maxLength={200}
              minLength={3}
              required
              autoFocus
              aria-label="Alasan penonaktifan"
            />
            {deactivateError && <div className="dash-alert dash-alert--error" role="alert">{deactivateError}</div>}
            <div className="users-modal-actions">
              <button type="button" className="dash-btn" onClick={() => setDeactivateTarget(null)}>
                Batal
              </button>
              <button
                type="submit"
                className="dash-btn dash-btn--danger"
                disabled={deactivateReason.trim().length < 3 || busy === deactivateTarget.id}
              >
                {busy === deactivateTarget.id ? "Menyimpan..." : "Nonaktifkan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal hapus akun — type-to-confirm, konfirmasi divalidasi server */}
      {deleteTarget && (
        <div className="users-overlay" role="dialog" aria-modal="true" aria-label="Hapus akun">
          <form className="users-modal" onSubmit={handleDelete}>
            <h3 className="users-modal-title">Hapus akun @{deleteTarget.username}</h3>
            <p className="users-modal-text">
              Tindakan ini <strong>permanen</strong>. Profil dan entri anggota terkait ikut
              terhapus, foto galeri milik akun ini ikut terhapus, dan tidak dapat
              dikembalikan. Untuk nonaktif sementara, gunakan &quot;Nonaktifkan&quot;.
            </p>
            <p className="users-modal-text users-modal-warning">
              Ketik <strong>{deleteTarget.username}</strong> untuk mengonfirmasi:
            </p>
            <input
              className="dash-input"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteTarget.username}
              autoComplete="off"
              aria-label="Ketik username untuk konfirmasi"
            />
            {deleteError && <div className="dash-alert dash-alert--error" role="alert">{deleteError}</div>}
            <div className="users-modal-actions">
              <button type="button" className="dash-btn" onClick={() => setDeleteTarget(null)}>
                Batal
              </button>
              <button
                type="submit"
                className="dash-btn dash-btn--danger"
                disabled={deleteConfirm !== deleteTarget.username || busy === deleteTarget.id}
              >
                {busy === deleteTarget.id ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .users-toolbar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .users-search { flex: 1; min-width: 160px; }
        .users-filter { width: auto; min-width: 120px; }

        .users-create-btn { white-space: nowrap; }

        .users-create-form {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .users-form-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .users-form-hint {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0.25rem 0 1rem;
        }

        .users-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.875rem;
          margin-bottom: 1rem;
        }

        .users-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 0.25rem;
        }

        .users-field-error {
          font-size: 0.7rem;
          color: var(--color-danger);
          margin-top: 0.25rem;
        }

        .users-form-submit { margin-top: 0.25rem; }

        .users-actions {
          display: flex;
          gap: 0.375rem;
          flex-wrap: wrap;
        }

        .users-delete-btn { white-space: nowrap; }

        .users-modal-warning {
          color: var(--color-danger);
        }

        .users-inactive-reason {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.68rem;
          color: var(--color-text-muted);
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .users-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 300;
        }

        .users-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 310;
          width: min(400px, calc(100vw - 2rem));
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .users-modal-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .users-modal-text {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          line-height: 1.55;
          margin-bottom: 1rem;
        }

        .users-modal-actions {
          display: flex;
          gap: 0.625rem;
          justify-content: flex-end;
          margin-top: 1rem;
        }

        /* Responsive: table → horizontal scroll container sudah dari .dash-table-wrap */
        @media (max-width: 720px) {
          .users-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
