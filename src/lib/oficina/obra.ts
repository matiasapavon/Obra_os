import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Resuelve la obra activa (misma consulta que el layout). Los layouts no pueden
// pasar props a las páginas hijas en App Router, así que cada página la re-resuelve
// con este helper. Sin obra activa → null (la página muestra el vacío).
export async function obraActiva(
  supabase: SupabaseServer,
): Promise<{ id: string; nombre: string } | null> {
  const { data } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("estado", "activa")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
