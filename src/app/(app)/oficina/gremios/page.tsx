import { createClient } from "@/lib/supabase/server";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";
import FormAlta from "@/components/oficina/FormAlta";

// Los gremios (contratistas) son globales al estudio: se reutilizan entre obras.
// Lo único que cambia por obra es a qué etapa se asigna cada uno.
const FORMAS_PAGO = [
  { value: "por_dia", label: "Por día" },
  { value: "por_m2", label: "Por m²" },
  { value: "ajuste_alzado", label: "Ajuste alzado" },
  { value: "certificados", label: "Certificados" },
];

const COLUMNAS: ColumnaOficina[] = [
  { key: "nombre", label: "Nombre" },
  { key: "especialidad", label: "Especialidad" },
  { key: "forma_pago", label: "Forma de pago" },
  { key: "contacto_nombre", label: "Contacto" },
  { key: "telefono", label: "Teléfono" },
  { key: "email", label: "Email" },
  { key: "calificacion", label: "Calif." },
];

export default async function GremiosPage() {
  const supabase = await createClient();

  const { data: gremios } = await supabase
    .from("gremios")
    .select("*")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  const filas = gremios ?? [];

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">Gremios</h2>
      <FormAlta
        tabla="gremios"
        etiqueta="Gremio"
        campos={[
          { key: "nombre", label: "Nombre", requerido: true },
          { key: "especialidad", label: "Especialidad" },
          { key: "forma_pago", label: "Forma de pago", tipo: "select", opciones: FORMAS_PAGO },
          { key: "contacto_nombre", label: "Contacto" },
          { key: "telefono", label: "Teléfono" },
          { key: "email", label: "Email" },
        ]}
      />
      <TablaOficina
        columnas={COLUMNAS}
        hayFilas={filas.length > 0}
        vacio="No hay gremios cargados."
      >
        {filas.map((g) => (
          <tr
            key={g.id}
            className={g.deleted_at ? "opacity-40" : ""}
            title={g.deleted_at ? "Fila borrada (soft-delete)" : undefined}
          >
            <CeldaEditable tabla="gremios" id={g.id} columna="nombre" valor={g.nombre} />
            <CeldaEditable
              tabla="gremios"
              id={g.id}
              columna="especialidad"
              valor={g.especialidad}
            />
            <CeldaEditable
              tabla="gremios"
              id={g.id}
              columna="forma_pago"
              valor={g.forma_pago}
              tipo="select"
              opciones={FORMAS_PAGO}
            />
            <CeldaEditable
              tabla="gremios"
              id={g.id}
              columna="contacto_nombre"
              valor={g.contacto_nombre}
            />
            <CeldaEditable
              tabla="gremios"
              id={g.id}
              columna="telefono"
              valor={g.telefono}
            />
            <CeldaEditable tabla="gremios" id={g.id} columna="email" valor={g.email} />
            <CeldaEditable
              tabla="gremios"
              id={g.id}
              columna="calificacion"
              valor={g.calificacion}
              tipo="number"
            />
          </tr>
        ))}
      </TablaOficina>
    </section>
  );
}
