import Link from "next/link";

// Superficie mobile: capturar (asistencia, tareas, materiales, diario).
// Acá nunca se pide ni se muestra dinero.
// TODO Fase 1: gating por rol (campo entra directo acá; admin puede ir a ambas).
export default function CampoPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="text-5xl">📋</div>
      <h1 className="text-2xl font-bold text-ink">Campo</h1>
      <p className="text-muted">
        Acá va la pantalla <span className="font-semibold text-ink">HOY</span>:
        asistencia, tareas del día, materiales y diario. Llega en la Fase 1.
      </p>
      <Link href="/" className="text-sm font-semibold text-brand underline">
        Volver al inicio
      </Link>
    </div>
  );
}
