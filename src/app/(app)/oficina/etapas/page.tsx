import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_curso", label: "En curso" },
  { value: "terminada", label: "Terminada" },
];

const COLS: ColumnaOficina[] = [
  { key: "orden", label: "Orden", alinear: "right" },
  { key: "nombre", label: "Etapa" },
  { key: "estado", label: "Estado" },
  { key: "fecha_inicio_plan", label: "Inicio plan" },
  { key: "fecha_fin_plan", label: "Fin plan" },
  { key: "fecha_inicio_real", label: "Inicio real" },
  { key: "fecha_fin_real", label: "Fin real" },
];

export default async function EtapasPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const { data: etapas } = await supabase
    .from("etapas")
    .select("*")
    .eq("obra_id", obra.id)
    .order("orden", { ascending: true });

  const filas = etapas ?? [];

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">Etapas</h2>
      <TablaOficina
        columnas={COLS}
        hayFilas={filas.length > 0}
        vacio="No hay etapas cargadas."
      >
        {filas.map((e) => (
          <tr
            key={e.id}
            className={e.deleted_at ? "opacity-40" : ""}
            title={e.deleted_at ? "Fila borrada (soft-delete)" : undefined}
          >
            <CeldaEditable
              tabla="etapas"
              id={e.id}
              columna="orden"
              valor={e.orden}
              tipo="number"
            />
            <CeldaEditable
              tabla="etapas"
              id={e.id}
              columna="nombre"
              valor={e.nombre}
            />
            <CeldaEditable
              tabla="etapas"
              id={e.id}
              columna="estado"
              valor={e.estado}
              tipo="select"
              opciones={ESTADOS}
            />
            <CeldaEditable
              tabla="etapas"
              id={e.id}
              columna="fecha_inicio_plan"
              valor={e.fecha_inicio_plan}
              tipo="date"
            />
            <CeldaEditable
              tabla="etapas"
              id={e.id}
              columna="fecha_fin_plan"
              valor={e.fecha_fin_plan}
              tipo="date"
            />
            <CeldaEditable
              tabla="etapas"
              id={e.id}
              columna="fecha_inicio_real"
              valor={e.fecha_inicio_real}
              tipo="date"
            />
            <CeldaEditable
              tabla="etapas"
              id={e.id}
              columna="fecha_fin_real"
              valor={e.fecha_fin_real}
              tipo="date"
            />
          </tr>
        ))}
      </TablaOficina>
    </section>
  );
}
