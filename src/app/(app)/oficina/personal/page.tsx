import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";
import FormAlta from "@/components/oficina/FormAlta";
import { formatFechaCorta } from "@/lib/format";

const COLUMNAS: ColumnaOficina[] = [
  { key: "nombre", label: "Nombre" },
  { key: "rol", label: "Rol" },
  { key: "telefono", label: "Teléfono" },
  { key: "gremio", label: "Gremio" },
  { key: "art_vencimiento", label: "Venc. ART" },
  { key: "seguro_vencimiento", label: "Venc. seguro" },
  { key: "created_at", label: "Alta" },
];

// Tono semántico por vencimiento: rojo si venció, amarillo si vence dentro de 30
// días, sin tono si falta más. null → sin tono.
function tonoVencimiento(fecha: string | null): "warn" | "alert" | undefined {
  if (!fecha) return undefined;
  const hoy = new Date();
  const msPorDia = 86_400_000;
  const dias = Math.round(
    (Date.parse(fecha) -
      Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) /
      msPorDia,
  );
  if (dias < 0) return "alert";
  if (dias <= 30) return "warn";
  return undefined;
}

export default async function PersonalPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const { data: personal } = await supabase
    .from("personal")
    .select("*, gremios(nombre)")
    .order("nombre", { ascending: true });

  const filas = personal ?? [];

  return (
    <section>
      <FormAlta
        tabla="personal"
        etiqueta="Persona"
        campos={[
          { key: "nombre", label: "Nombre", requerido: true },
          { key: "rol", label: "Rol" },
          { key: "telefono", label: "Teléfono" },
        ]}
      />
      <TablaOficina columnas={COLUMNAS} hayFilas={filas.length > 0}>
      {filas.map((p) => (
        <tr
          key={p.id}
          className={p.deleted_at ? "opacity-40" : ""}
          title={p.deleted_at ? "Fila borrada (soft-delete)" : undefined}
        >
          <CeldaEditable
            tabla="personal"
            id={p.id}
            columna="nombre"
            valor={p.nombre}
          />
          <CeldaEditable tabla="personal" id={p.id} columna="rol" valor={p.rol} />
          <CeldaEditable
            tabla="personal"
            id={p.id}
            columna="telefono"
            valor={p.telefono}
          />
          <td className="px-3 py-1.5 align-middle">
            {p.gremios?.nombre ?? <span className="text-pending">—</span>}
          </td>
          <CeldaEditable
            tabla="personal"
            id={p.id}
            columna="art_vencimiento"
            valor={p.art_vencimiento}
            tipo="date"
            tono={tonoVencimiento(p.art_vencimiento)}
          />
          <CeldaEditable
            tabla="personal"
            id={p.id}
            columna="seguro_vencimiento"
            valor={p.seguro_vencimiento}
            tipo="date"
            tono={tonoVencimiento(p.seguro_vencimiento)}
          />
          <td className="px-3 py-1.5 align-middle text-muted">
            {formatFechaCorta(p.created_at)}
          </td>
        </tr>
        ))}
      </TablaOficina>
    </section>
  );
}
