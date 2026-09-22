import type { SessionUser } from "@/lib/session";
import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";

// Komponen UI bersama untuk dashboard — konsisten dengan gaya Phase 1-2.

export function DashCSS() {
  return (
    <style>{`
      .dash-section {
        margin-bottom: 2rem;
      }
      .dash-section-title {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--color-text-subtle);
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--color-border-light);
      }
      .dash-grid-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        margin-bottom: 2rem;
      }
      .stat-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: 1.125rem 1.25rem;
        transition: border-color 0.15s, transform 0.15s;
      }
      .stat-card:hover {
        border-color: var(--color-accent);
        transform: translateY(-1px);
      }
      .stat-card-number {
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--color-text);
        line-height: 1.2;
      }
      .stat-card-label {
        font-size: 0.7rem;
        color: var(--color-text-subtle);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-top: 0.25rem;
      }
      .dash-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: 1.25rem;
      }
      .dash-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .dash-item {
        padding: 0.875rem 1rem;
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        background: var(--color-bg-alt);
      }
      .dash-item-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text);
      }
      .dash-item-desc {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin-top: 0.25rem;
        line-height: 1.6;
      }
      .dash-item-meta {
        font-size: 0.7rem;
        color: var(--color-text-subtle);
        margin-top: 0.375rem;
      }
      .dash-empty {
        text-align: center;
        padding: 2rem 1rem;
        color: var(--color-text-muted);
        font-size: 0.85rem;
      }
      .dash-alert {
        padding: 0.625rem 0.875rem;
        border-radius: 8px;
        font-size: 0.825rem;
        margin-bottom: 1rem;
      }
      .dash-alert--success { background: var(--color-success-soft); border: 1px solid var(--color-success); color: var(--color-success); }
      .dash-alert--error { background: var(--color-danger-soft); border: 1px solid var(--color-danger); color: var(--color-danger); }
      .dash-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
      }
      .dash-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.825rem;
      }
      .dash-table th {
        padding: 0.625rem 0.875rem;
        text-align: left;
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-subtle);
        background: var(--color-bg-alt);
        border-bottom: 1px solid var(--color-border);
        white-space: nowrap;
      }
      .dash-table td {
        padding: 0.625rem 0.875rem;
        color: var(--color-text);
        border-bottom: 1px solid var(--color-border-light);
      }
      .dash-table tr:last-child td { border-bottom: none; }
      .dash-btn {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: var(--color-primary);
        color: #fff;
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        font-weight: 550;
        border: none;
        cursor: pointer;
        transition: background 0.15s, transform 0.15s;
      }
      .dash-btn:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-1px); }
      .dash-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      .dash-btn--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);
      }
      .dash-btn--secondary:hover:not(:disabled) {
        background: var(--color-surface-hover);
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
      .dash-btn--danger {
        background: var(--color-danger);
      }
      .dash-btn--danger:hover:not(:disabled) { background: var(--color-danger); opacity: 0.85; }
      .dash-btn--sm {
        padding: 0.3125rem 0.625rem;
        font-size: 0.75rem;
      }
      .dash-form-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 0.25rem;
      }
      .dash-form-input,
      .dash-form-select,
      .dash-form-textarea {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: 0.825rem;
        background: var(--color-surface);
        color: var(--color-text);
        outline: none;
        font-family: inherit;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .dash-form-input:focus,
      .dash-form-select:focus,
      .dash-form-textarea:focus {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px var(--color-accent-soft);
      }
      .dash-form-error {
        font-size: 0.7rem;
        color: var(--color-danger);
        margin-top: 0.25rem;
      }
      .dash-form-group {
        margin-bottom: 0.875rem;
      }
      .dash-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 300;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .dash-modal {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        max-width: 480px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        animation: modalIn 0.16s ease;
      }
      @keyframes modalIn {
        from { opacity: 0; transform: translateY(6px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .dash-modal-title {
        font-size: 1.05rem;
        font-weight: 700;
        margin-bottom: 1rem;
      }
      .dash-modal-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        margin-top: 1.25rem;
      }
      .dash-page-header {
        margin-bottom: 1.75rem;
      }
      .dash-page-title {
        font-size: 1.375rem;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .dash-page-desc {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin-top: 0.25rem;
      }
      .dash-status {
        display: inline-block;
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
      }
      .dash-status--published { background: var(--color-success-soft); color: var(--color-success); }
      .dash-status--draft { background: var(--color-warning-soft); color: var(--color-warning); }
      .dash-status--archived { background: var(--color-border-light); color: var(--color-text-muted); }
      @media (min-width: 640px) {
        .dash-grid-stats { grid-template-columns: repeat(4, 1fr); }
      }
    `}</style>
  );
}

export function WelcomeHeader({ user }: { user: SessionUser }) {
  return (
    <div className="dash-page-header">
      <h1 className="dash-page-title">
        Selamat datang, {user.fullName}
      </h1>
      <p className="dash-page-desc">
        Dashboard {ROLE_LABELS[user.role as Role]} — website kelas X TKJ BK.
      </p>
    </div>
  );
}

export function StatGrid({
  items,
}: {
  items: { label: string; value: number | string }[];
}) {
  return (
    <div className="dash-grid-stats">
      {items.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-card-number">{s.value}</div>
          <div className="stat-card-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="dash-section-title">{children}</h2>;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
