import { db, type MaterialRow, type PedidoCampoRow } from "./db";
import { encolar } from "./sync";
import { fechaHoyISO } from "@/lib/format";

/** Estado de pedido que le interesa a campo. La plata la completa admin. */
export type EstadoPedido = "a_pedir" | "pedido" | "en_camino" | "entregado" | "faltante";

/** Un pedido cuenta como "abierto" (falta o en tránsito) mientras no se entregó. */
export function esPedidoAbierto(pedido: PedidoCampoRow): boolean {
  return pedido.estado === "faltante";
}

/**
 * Devuelve el último pedido de un material (por created_at) para pintar su
 * estado en la lista. Sin pedidos → undefined.
 */
export function ultimoPedido(
  pedidos: PedidoCampoRow[],
  materialId: string,
): PedidoCampoRow | undefined {
  return pedidos
    .filter((p) => p.material_id === materialId)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
}

/** Busca un faltante abierto de un material (para habilitar LLEGÓ). */
export function faltanteAbierto(
  pedidos: PedidoCampoRow[],
  materialId: string,
): PedidoCampoRow | undefined {
  return pedidos.find((p) => p.material_id === materialId && esPedidoAbierto(p));
}

/** Alta mínima de material desde mobile (nombre + unidad opcional). */
export async function altaMaterial(
  obraId: string,
  nombre: string,
  unidad: string | null,
): Promise<void> {
  const ahora = new Date().toISOString();
  const fila: MaterialRow = {
    id: crypto.randomUUID(),
    obra_id: obraId,
    nombre,
    unidad,
    rubro_id: null,
    proveedor_habitual: null,
    lead_time_dias: null,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  };
  await db.materiales.put(fila);
  // Solo columnas NOT NULL + provistas; created_at/updated_at los maneja la base.
  await encolar("materiales", {
    id: fila.id,
    obra_id: fila.obra_id,
    nombre: fila.nombre,
    unidad: fila.unidad,
  });
}

/**
 * Marca que falta un material: crea un pedido NUEVO en estado 'faltante'.
 * Campo escribe a la tabla base `pedidos_materiales` SIN columnas de costo
 * (RLS exige costo_estimado/costo_real/gasto_id null). El espejo local usa la
 * forma de la vista `pedidos_materiales_campo`.
 */
export async function marcarFalta(
  obraId: string,
  etapaId: string,
  materialId: string,
): Promise<void> {
  const id = crypto.randomUUID();
  const ahora = new Date().toISOString();
  const fila: PedidoCampoRow = {
    id,
    obra_id: obraId,
    etapa_id: etapaId,
    material_id: materialId,
    estado: "faltante",
    cantidad: null,
    fecha_necesidad: null,
    fecha_pedido: null,
    fecha_entrega_estimada: null,
    fecha_entrega_real: null,
    proveedor: null,
    notas: null,
    created_offline: true,
    created_at: ahora,
    updated_at: ahora,
  };
  await db.pedidos_campo.put(fila);
  await encolar("pedidos_materiales", {
    id,
    obra_id: obraId,
    etapa_id: etapaId,
    material_id: materialId,
    estado: "faltante",
    created_offline: true,
  });
}

/**
 * Marca que llegó un pedido faltante: transiciona el MISMO pedido a 'entregado'
 * y registra la fecha de entrega real. Re-incluye las NOT NULL (obra_id,
 * material_id) porque el upsert valida la rama INSERT. Nunca columnas de costo.
 */
export async function marcarLlego(pedido: PedidoCampoRow): Promise<void> {
  // La vista tipa todo como nullable; un pedido real siempre tiene id/obra/material.
  if (!pedido.id || !pedido.obra_id || !pedido.material_id) return;
  const hoy = fechaHoyISO();
  const fila: PedidoCampoRow = {
    ...pedido,
    estado: "entregado",
    fecha_entrega_real: hoy,
    updated_at: new Date().toISOString(),
  };
  await db.pedidos_campo.put(fila);
  await encolar("pedidos_materiales", {
    id: pedido.id,
    obra_id: pedido.obra_id,
    material_id: pedido.material_id,
    estado: "entregado",
    fecha_entrega_real: hoy,
  });
}

/** Hidrata los espejos de materiales y pedidos de campo (pisa lo del server). */
export async function hidratarMateriales(
  materiales: MaterialRow[],
  pedidos: PedidoCampoRow[],
): Promise<void> {
  await db.transaction("rw", db.cola, db.materiales, db.pedidos_campo, async () => {
    // No pisar filas creadas offline que todavía no sincronizaron.
    const idsEnCola = new Set((await db.cola.toArray()).map((i) => i.id));
    await db.materiales.where("id").noneOf([...idsEnCola]).delete();
    await db.materiales.bulkPut(materiales.filter((m) => !idsEnCola.has(m.id)));
    await db.pedidos_campo.where("id").noneOf([...idsEnCola]).delete();
    await db.pedidos_campo.bulkPut(
      pedidos.filter((p) => p.id != null && !idsEnCola.has(p.id)),
    );
  });
}
