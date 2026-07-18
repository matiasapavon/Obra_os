"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Crea un adicional 'propuesto' a partir de una nota de diario etiquetada
// "extra" en campo (change event liviano: se captura el hecho sin monto; el
// precio se pone después en /oficina/adicionales). Idempotente por nota:
// adicionales.diario_id es unique y acá se re-chequea antes de insertar.
export async function crearAdicionalDesdeNota(
  diarioId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  // Defensa en profundidad: re-chequear admin (no confiar solo en el layout).
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

  const { data: nota } = await supabase
    .from("diario_obra")
    .select("id, obra_id, texto, fecha, etiquetas")
    .eq("id", diarioId)
    .maybeSingle();
  if (!nota) return { ok: false, error: "Nota no encontrada" };
  if (!nota.etiquetas.includes("extra")) {
    return { ok: false, error: "La nota no está etiquetada como trabajo extra" };
  }

  const { data: existente } = await supabase
    .from("adicionales")
    .select("id")
    .eq("diario_id", diarioId)
    .maybeSingle();
  if (existente) return { ok: false, error: "La nota ya tiene un adicional" };

  // Evidencia: la primera foto subida de la nota (si hay).
  const { data: foto } = await supabase
    .from("fotos")
    .select("url")
    .eq("diario_id", diarioId)
    .eq("estado_upload", "subida")
    .is("deleted_at", null)
    .order("captured_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { error: errorInsert } = await supabase.from("adicionales").insert({
    obra_id: nota.obra_id,
    diario_id: nota.id,
    descripcion: nota.texto || "Trabajo extra (nota de campo)",
    estado: "propuesto",
    origen: "imprevisto",
    fecha: nota.fecha,
    evidencia_url: foto?.url ?? null,
  });
  if (errorInsert) return { ok: false, error: errorInsert.message };

  revalidatePath("/oficina/diario");
  revalidatePath("/oficina/adicionales");
  return { ok: true };
}
