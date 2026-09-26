/** Fallback route /anggota saat RSC payload dimuat — skeleton grid member. */
export default function AnggotaLoading() {
  return (
    <div className="container page-body" aria-busy="true" aria-live="polite">
      <div className="page-header-skeleton" />
      <div className="member-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="member-skeleton" />
        ))}
      </div>
      <style>{`
        .page-header-skeleton {
          height: 64px;
          border-radius: var(--radius-md);
          background: var(--color-bg-alt);
          margin-bottom: 2rem;
        }
        .member-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.625rem;
        }
        .member-skeleton {
          height: 64px;
          border-radius: var(--radius-sm);
          background: var(--color-bg-alt);
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          padding-top: 2.5rem;
          padding-bottom: 4rem;
        }
        @media (min-width: 640px) {
          .member-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
    </div>
  );
}
