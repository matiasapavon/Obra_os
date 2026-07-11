"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pestañas de sección de la oficina. Client component chico porque el layout es
// server: acá se necesita usePathname para resaltar la pestaña activa.
const TABS = [
  { href: "/oficina/resumen", label: "Resumen" },
  { href: "/oficina/tareas", label: "Tareas" },
  { href: "/oficina/etapas", label: "Etapas" },
  { href: "/oficina/materiales", label: "Materiales" },
  { href: "/oficina/personal", label: "Personal" },
  { href: "/oficina/asistencias", label: "Asistencias" },
  { href: "/oficina/diario", label: "Diario" },
  { href: "/oficina/rubros", label: "Rubros" },
  { href: "/oficina/gastos", label: "Gastos" },
  { href: "/oficina/compromisos", label: "Compromisos" },
  { href: "/oficina/ingresos", label: "Ingresos" },
  { href: "/oficina/adicionales", label: "Adicionales" },
  { href: "/oficina/vencimientos", label: "Vencimientos" },
  { href: "/oficina/alertas", label: "Alertas" },
];

export default function OficinaNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/10">
      {TABS.map((tab) => {
        const activa =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`min-h-9 shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              activa
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
