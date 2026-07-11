import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";
import CeldaEstado from "@/components/oficina/CeldaEstado";

const ESTADOS_PEDIDO = [
  { value: "a_pedir", label: "A pedir" },
  { value: "pedido", label: "Pedido" },
  { value: "en_camino", label: "En camino" },
  { value: "entregado", label: "Entregado" },
  { value: "faltante", label: "Faltante" },
];

const UNIDADES = [
  { value: "bolsa", label: "bolsa" },
  { value: "m3", label: "m3" },
  { value: "ml", label: "ml" },
  { value: "un", label: "un" },
  { value: "kg", label: "kg" },
  { value: "lt", label: "lt" },
];

const COLS_PEDIDOS: ColumnaOficina[] = [
  { key: "material", label: "Material" },
  { key: "cantidad", label: "Cantidad", alinear: "right" },
  { key: "estado", label: "Estado" },
  { key: "fecha_necesidad", label: "Necesidad" },
  { key: "fecha_pedido", label: "Pedido" },
  { key: "fecha_entrega_estimada", label: "Entrega est." },
  { key: "fecha_entrega_real", label: "Entrega real" },
  { key: "proveedor", label: "Proveedor" },
  { key: "costo_estimado", label: "Costo est.", alinear: "right" },
  { key: "costo_real", label: "Costo real", alinear: "right" },
  { key: "notas", label: "Notas" },
];

const COLS_CATALOGO: ColumnaOficina[] = [
  { key: "nombre", label: "Material" },
  { key: "unidad", label: "Unidad" },
  { key: "proveedor_habitual", label: "Proveedor habitual" },
  { key: "lead_time_dias", label: "Lead time (días)", alinear: "right" },
];

export default async function MaterialesPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const [{ data: pedidos }, { data: catalogo }] = await Promise.all([
    supabase
      .from("pedidos_materiales")
      .select("*, materiales(nombre)")
      .eq("obra_id", obra.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("materiales")
      .select("*")
      .eq("obra_id", obra.id)
      .order("nombre", { ascending: true }),
  ]);

  const filasPedidos = pedidos ?? [];
  const filasCatalogo = catalogo ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Pedidos</h2>
        <TablaOficina
          columnas={COLS_PEDIDOS}
          hayFilas={filasPedidos.length > 0}
          vacio="No hay pedidos cargados."
        >
          {filasPedidos.map((p) => (
            <tr
              key={p.id}
              className={p.deleted_at ? "opacity-40" : ""}
              title={p.deleted_at ? "Fila borrada (soft-delete)" : undefined}
            >
              <td className="px-3 py-1.5 align-middle font-medium text-ink">
                {p.materiales?.nombre ?? (
                  <span className="text-pending">—</span>
                )}
              </td>
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="cantidad"
                valor={p.cantidad}
                tipo="number"
              />
              <CeldaEstado
                tabla="pedidos_materiales"
                id={p.id}
                valor={p.estado}
                tipo="pedidos"
                opciones={ESTADOS_PEDIDO}
              />
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="fecha_necesidad"
                valor={p.fecha_necesidad}
                tipo="date"
              />
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="fecha_pedido"
                valor={p.fecha_pedido}
                tipo="date"
              />
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="fecha_entrega_estimada"
                valor={p.fecha_entrega_estimada}
                tipo="date"
              />
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="fecha_entrega_real"
                valor={p.fecha_entrega_real}
                tipo="date"
              />
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="proveedor"
                valor={p.proveedor}
              />
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="costo_estimado"
                valor={p.costo_estimado}
                tipo="money"
              />
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="costo_real"
                valor={p.costo_real}
                tipo="money"
              />
              <CeldaEditable
                tabla="pedidos_materiales"
                id={p.id}
                columna="notas"
                valor={p.notas}
              />
            </tr>
          ))}
        </TablaOficina>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">
          Materiales (catálogo)
        </h2>
        <TablaOficina
          columnas={COLS_CATALOGO}
          hayFilas={filasCatalogo.length > 0}
          vacio="No hay materiales en el catálogo."
        >
          {filasCatalogo.map((m) => (
            <tr
              key={m.id}
              className={m.deleted_at ? "opacity-40" : ""}
              title={m.deleted_at ? "Fila borrada (soft-delete)" : undefined}
            >
              <CeldaEditable
                tabla="materiales"
                id={m.id}
                columna="nombre"
                valor={m.nombre}
              />
              <CeldaEditable
                tabla="materiales"
                id={m.id}
                columna="unidad"
                valor={m.unidad}
                tipo="select"
                opciones={UNIDADES}
              />
              <CeldaEditable
                tabla="materiales"
                id={m.id}
                columna="proveedor_habitual"
                valor={m.proveedor_habitual}
              />
              <CeldaEditable
                tabla="materiales"
                id={m.id}
                columna="lead_time_dias"
                valor={m.lead_time_dias}
                tipo="number"
              />
            </tr>
          ))}
        </TablaOficina>
      </section>
    </div>
  );
}
