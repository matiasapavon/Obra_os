import Link from "next/link";

// Flecha de vuelta. Por defecto a la home de campo (HOY); las secciones dentro
// de una etapa pasan el hub de esa etapa como destino. Target táctil ≥48px.
export default function VolverCampo({ href = "/campo" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Volver"
      className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-2xl text-brand active:bg-brand/10"
    >
      ←
    </Link>
  );
}
