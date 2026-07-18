"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { fechaHoyISO } from "@/lib/format";

// Allow-list de columnas insertables por tabla. Cualquier clave fuera de acá se
// descarta del payload — evita que un POST armado escriba columnas arbitrarias.
// obra_id NO figura: lo inyecta el server desde la obra en foco.
const INSERTABLES: Record<string, readonly string[]> = {
  personal: ["nombre", "rol", "telefono"],
  tareas: ["nombre", "descripcion", "ubicacion"],
  etapas: ["nombre", "orden"],
  rubros: ["nombre", "presupuesto_base"],
  gastos: ["concepto", "monto", "rubro_id", "fecha", "tipo", "medio_pago", "moneda"],
  compromisos: ["concepto", "monto_total", "fecha_estimada_pago", "rubro_id"],
  ingresos: ["concepto", "monto", "fecha", "moneda"],
  adicionales: ["descripcion", "origen", "lo_paga", "costo_estimado"],
  vencimientos_admin: ["tipo", "fecha_vencimiento", "descripcion", "responsable"],
};

// Tablas que no cuelgan de una obra (personal es global al estudio).
const SIN_OBRA = new Set(["personal"]);

// Tablas con `fecha date default current_date`: ese default corre en UTC en la
// base, así que un alta de noche en Argentina caería un día adelantada. Cuando
// la fecha viene vacía la fijamos con el día real en zona AR.
const FECHA_DEFAULT_AR = new Set(["gastos", "ingresos", "adicionales"]);

const RUTA: Record<string, string> = {
  vencimientos_admin: "vencimientos",
};

// Mismo criterio que UpdateDinamico en actualizarCampo.ts: tabla dinámica ya
// validada por allow-list, así que el insert se tipa con una interfaz mínima.
type InsertDinamico = {
  from: (tabla: string) => {
    insert: (
      valores: Record<string, unknown>,
    ) => PromiseLike<{ error: { message: string } | null }>;
  };
};

export async function crearFila(
  tabla: string,
  valores: Record<string, string | number | null>,
): Promise<{ ok: boolean; error?: string }> {
  const permitidas = INSERTABLES[tabla];
  if (!permitidas) return { ok: false, error: "Tabla no insertable" };

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

  // Solo columnas de la allow-list, sin vacíos (los defaults los pone la base).
  const payload: Record<string, unknown> = {};
  for (const col of permitidas) {
    const v = valores[col];
    if (v !== undefined && v !== null && v !== "") payload[col] = v;
  }

  if (FECHA_DEFAULT_AR.has(tabla) && !payload.fecha) {
    payload.fecha = fechaHoyISO();
  }

  if (!SIN_OBRA.has(tabla)) {
    // La obra en foco se resuelve server-side (cookie → activa), nunca del cliente.
    const obra = await obraActiva(supabase);
    if (!obra) return { ok: false, error: "No hay ninguna obra activa" };
    payload.obra_id = obra.id;

    // gastos.rubro_id es NOT NULL: sin rubro elegido cae en "Sin clasificar".
    if (tabla === "gastos" && !payload.rubro_id) {
      const { data: sistema } = await supabase
        .from("rubros")
        .select("id")
        .eq("obra_id", obra.id)
        .eq("es_sistema", true)
        .maybeSingle();
      if (!sistema) return { ok: false, error: "La obra no tiene rubro Sin clasificar" };
      payload.rubro_id = sistema.id;
    }
  }

  const { error } = await (supabase as unknown as InsertDinamico)
    .from(tabla)
    .insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/oficina/${RUTA[tabla] ?? tabla}`);
  return { ok: true };
}
