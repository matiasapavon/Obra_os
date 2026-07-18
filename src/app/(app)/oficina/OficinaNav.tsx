"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pestañas de sección de la oficina, agrupadas por uso real (16 tabs planas
// eran ilegibles). Client component chico porque el layout es server: acá se
// necesita usePathname para resaltar la pestaña activa.
const GRUPOS: { grupo: string; tabs: { href: string; label: string }[] }[] = [
  {
    grupo: "Obra",
    tabs: [
      { href: "/oficina/resumen", label: "Resumen" },
      { href: "/oficina/alertas", label: "Alertas" },
      { href: "/oficina/vencimientos", label: "Vencimientos" },
    ],
  },
  {
    grupo: "Operación",
    tabs: [
      { href: "/oficina/tareas", label: "Tareas" },
      { href: "/oficina/etapas", label: "Etapas" },
      { href: "/oficina/materiales", label: "Materiales" },
      { href: "/oficina/gremios", label: "Gremios" },
      { href: "/oficina/personal", label: "Personal" },
      { href: "/oficina/asistencias", label: "Asistencias" },
      { href: "/oficina/diario", label: "Diario" },
      { href: "/oficina/punch", label: "Punch" },
    ],
  },
  {
    grupo: "Plata",
    tabs: [
      { href: "/oficina/rubros", label: "Rubros" },
      { href: "/oficina/gastos", label: "Gastos" },
      { href: "/oficina/compromisos", label: "Compromisos" },
      { href: "/oficina/ingresos", label: "Ingresos" },
      { href: "/oficina/adicionales", label: "Adicionales" },
    ],
  },
];

export default function OficinaNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-line pb-3">
      {GRUPOS.map(({ grupo, tabs }) => (
        <div key={grupo} className="flex flex-col gap-1.5">
          <span className="px-1 text-xs font-semibold tracking-wide text-pending">
            {grupo}
          </span>
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const activa =
                pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`min-h-9 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    activa
                      ? "bg-brand/10 text-brand"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
