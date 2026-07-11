// Pill de estado con semántica de color FIJA (globals.css): verde=ok, amarillo=
// atención, rojo=acción, gris=pendiente. Espeja los mapas ESTILO de campo.
// Presentacional: no necesita "use client".

type Estilo = { clase: string; etiqueta: string };

const TAREAS: Record<string, Estilo> = {
  pendiente: { clase: "border-pending/40 bg-pending/10 text-muted", etiqueta: "Pendiente" },
  en_curso: { clase: "border-warn/40 bg-warn/10 text-warn", etiqueta: "En curso" },
  terminada: { clase: "border-ok/40 bg-ok/10 text-ok", etiqueta: "Terminada" },
  bloqueada: { clase: "border-alert/40 bg-alert/10 text-alert", etiqueta: "Bloqueada" },
};

const PEDIDOS: Record<string, Estilo> = {
  a_pedir: { clase: "border-pending/40 bg-pending/10 text-muted", etiqueta: "A pedir" },
  faltante: { clase: "border-alert/40 bg-alert/10 text-alert", etiqueta: "Faltante" },
  pedido: { clase: "border-warn/40 bg-warn/10 text-warn", etiqueta: "Pedido" },
  en_camino: { clase: "border-warn/40 bg-warn/10 text-warn", etiqueta: "En camino" },
  entregado: { clase: "border-ok/40 bg-ok/10 text-ok", etiqueta: "Entregado" },
};

const NEUTRO: Estilo = {
  clase: "border-pending/40 bg-pending/10 text-muted",
  etiqueta: "",
};

export default function BadgeEstado({
  estado,
  tipo = "tareas",
}: {
  estado: string;
  tipo?: "tareas" | "pedidos";
}) {
  const mapa = tipo === "pedidos" ? PEDIDOS : TAREAS;
  const estilo = mapa[estado] ?? { ...NEUTRO, etiqueta: estado };

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${estilo.clase}`}
    >
      {estilo.etiqueta || estado}
    </span>
  );
}
