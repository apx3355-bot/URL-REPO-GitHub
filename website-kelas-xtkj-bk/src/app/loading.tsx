/**
 * Maintenance V0.1 — route loading state global.
 * App Router menampilkan fallback ini saat RSC payload sedang di-fetch
 * (navigasi terasa instan di mobile: feedback langsung, bukan layar beku).
 * HTML statis (tanpa JS) — nol biaya runtime.
 */
export default function Loading() {
  return (
    <div aria-hidden="true">
      <div className="route-progress" />
    </div>
  );
}
