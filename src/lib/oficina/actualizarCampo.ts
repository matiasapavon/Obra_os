"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Allow-list de columnas editables por tabla. Cualquier columna fuera de acá
// se rechaza — evita que un patch armado escriba columnas arbitrarias.
const EDITABLES: Record<string, readonly string[]> = {
  tareas: ["nombre", "estado", "porcentaje_avance", "descripcion", "ubicacion", "orden",
    "fecha_inicio_plan", "fecha_fin_plan", "fecha_inicio_real", "fecha_fin_real"],
  personal: ["nombre", "rol", "telefono", "art_vencimiento", "seguro_vencimiento"],
  materiales: ["nombre", "unidad", "proveedor_habitual", "lead_time_dias"],
  pedidos_materiales: ["estado", "cantidad", "proveedor", "costo_estimado", "costo_real",
    "fecha_necesidad", "fecha_pedido", "fecha_entrega_estimada", "fecha_entrega_real", "notas"],
  asistencias: ["observacion", "medio_dia", "hora_entrada", "hora_salida"],
  rubros: ["nombre", "presupuesto_base", "notas"],
  gastos: ["concepto", "monto", "moneda", "tipo", "medio_pago", "fecha", "rubro_id",
    "comprobante_url", "notas"],
  compromisos: ["concepto", "monto_total", "monto_pagado", "estado", "fecha_estimada_pago",
    "rubro_id", "notas"],
  ingresos: ["concepto", "monto", "moneda", "fecha", "notas"],
  adicionales: ["descripcion", "estado", "origen", "lo_paga", "costo_estimado", "costo_real",
    "fecha", "notas"],
  vencimientos_admin: ["tipo", "descripcion", "fecha_vencimiento", "alerta_dias_antes",
    "estado", "responsable"],
  etapas: ["nombre", "estado", "orden", "gremio_id", "fecha_inicio_plan", "fecha_fin_plan",
    "fecha_inicio_real", "fecha_fin_real"],
  gremios: ["nombre", "especialidad", "forma_pago", "contacto_nombre", "telefono",
    "email", "calificacion", "notas"],
};

// El pedido se gestiona dentro de la pestaña Materiales; el resto de las tablas
// tiene ruta homónima.
const RUTA: Record<string, string> = {
  pedidos_materiales: "materiales",
  vencimientos_admin: "vencimientos",
};

// El nombre de tabla y la columna son dinámicos pero ya validados contra la
// allow-list de arriba, así que el tipado por-tabla del cliente no ayuda acá:
// casteamos a una interfaz mínima de update dinámico (defensa en runtime, no en
// tipos). Nada de `any`: la forma queda explícita.
type UpdateDinamico = {
  from: (tabla: string) => {
    update: (valores: Record<string, unknown>) => {
      eq: (
        columna: string,
        valor: string,
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

export async function actualizarCampo(
  tabla: string,
  id: string,
  columna: string,
  valor: string | number | boolean | null,
): Promise<{ ok: boolean; error?: string }> {
  const permitidas = EDITABLES[tabla];
  if (!permitidas || !permitidas.includes(columna)) {
    return { ok: false, error: "Columna no editable" };
  }
  const supabase = await createClient();

  // Defensa en profundidad: re-chequear admin en el server action (no confiar
  // solo en el layout).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.role !== "admin") return { ok: false, error: "No autorizado" };

  const { error } = await (supabase as unknown as UpdateDinamico)
    .from(tabla)
    .update({ [columna]: valor })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/oficina/${RUTA[tabla] ?? tabla}`);
  return { ok: true };
}
