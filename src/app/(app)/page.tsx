export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="text-5xl">🏗️</div>
      <h1 className="text-2xl font-bold text-ink">Estás adentro</h1>
      <p className="text-muted">
        La base está lista: auth, base de datos y app instalable. La pantalla{" "}
        <span className="font-semibold text-ink">HOY</span> (asistencia, tareas,
        materiales y notas) llega en la Fase 1.
      </p>
      <p className="text-sm text-pending">Fase 0 — Fundaciones ✓</p>
    </div>
  );
}
