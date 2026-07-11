import Link from "next/link";

// Superficie desktop: gestionar y entender (economía, cronograma, dashboards).
// TODO Fase 1: gating por rol (solo admin entra acá).
export default function OficinaPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="text-5xl">🗂️</div>
      <h1 className="text-2xl font-bold text-ink">Oficina</h1>
      <p className="text-muted">
        Acá van las vistas de gestión: tablas, economía y cronograma. Las
        primeras tablas llegan en la Fase 1; la economía en la Fase 2.
      </p>
      <Link href="/" className="text-sm font-semibold text-brand underline">
        Volver al inicio
      </Link>
    </div>
  );
}
