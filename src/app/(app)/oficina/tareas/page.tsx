import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";
import CeldaEstado from "@/components/oficina/CeldaEstado";
import FormAlta from "@/components/oficina/FormAlta";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_curso", label: "En curso" },
  { value: "terminada", label: "Terminada" },
  { value: "bloqueada", label: "Bloqueada" },
];

const COLUMNAS: ColumnaOficina[] = [
  { key: "nombre", label: "Tarea" },
  { key: "estado", label: "Estado" },
  { key: "porcentaje_avance", label: "% avance", alinear: "right" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "orden", label: "Orden", alinear: "right" },
  { key: "fecha_inicio_plan", label: "Inicio plan" },
  { key: "fecha_fin_plan", label: "Fin plan" },
  { key: "fecha_inicio_real", label: "Inicio real" },
  { key: "fecha_fin_real", label: "Fin real" },
];

export default async function TareasPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const { data: tareas } = await supabase
    .from("tareas")
    .select("*")
    .eq("obra_id", obra.id)
    .order("orden", { ascending: true });

  const filas = tareas ?? [];

  return (
    <section>
      <FormAlta
        tabla="tareas"
        etiqueta="Tarea"
        campos={[
          { key: "nombre", label: "Nombre", requerido: true },
          { key: "ubicacion", label: "Ubicación" },
        ]}
      />
      <TablaOficina columnas={COLUMNAS} hayFilas={filas.length > 0}>
      {filas.map((t) => (
        <tr
          key={t.id}
          className={t.deleted_at ? "opacity-40" : ""}
          title={t.deleted_at ? "Fila borrada (soft-delete)" : undefined}
        >
          <CeldaEditable tabla="tareas" id={t.id} columna="nombre" valor={t.nombre} />
          <CeldaEstado
            tabla="tareas"
            id={t.id}
            valor={t.estado}
            tipo="tareas"
            opciones={ESTADOS}
          />
          <CeldaEditable
            tabla="tareas"
            id={t.id}
            columna="porcentaje_avance"
            valor={t.porcentaje_avance}
            tipo="number"
          />
          <CeldaEditable
            tabla="tareas"
            id={t.id}
            columna="ubicacion"
            valor={t.ubicacion}
          />
          <CeldaEditable
            tabla="tareas"
            id={t.id}
            columna="orden"
            valor={t.orden}
            tipo="number"
          />
          <CeldaEditable
            tabla="tareas"
            id={t.id}
            columna="fecha_inicio_plan"
            valor={t.fecha_inicio_plan}
            tipo="date"
          />
          <CeldaEditable
            tabla="tareas"
            id={t.id}
            columna="fecha_fin_plan"
            valor={t.fecha_fin_plan}
            tipo="date"
          />
          <CeldaEditable
            tabla="tareas"
            id={t.id}
            columna="fecha_inicio_real"
            valor={t.fecha_inicio_real}
            tipo="date"
          />
          <CeldaEditable
            tabla="tareas"
            id={t.id}
            columna="fecha_fin_real"
            valor={t.fecha_fin_real}
            tipo="date"
          />
        </tr>
        ))}
      </TablaOficina>
    </section>
  );
}
