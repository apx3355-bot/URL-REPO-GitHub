/** Fallback route /galeri saat RSC payload dimuat — skeleton masonry foto. */
export default function GaleriLoading() {
  return (
    <div className="container page-body" aria-busy="true" aria-live="polite">
      <div className="page-header-skeleton" />
      <div className="galeri-skeleton-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="galeri-skeleton" style={{ height: i % 3 === 0 ? 220 : 160 }} />
        ))}
      </div>
      <style>{`
        .page-header-skeleton {
          height: 64px;
          border-radius: var(--radius-md);
          background: var(--color-bg-alt);
          margin-bottom: 2rem;
        }
        .galeri-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        .galeri-skeleton {
          border-radius: var(--radius-md);
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
          .galeri-skeleton-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </div>
  );
}
