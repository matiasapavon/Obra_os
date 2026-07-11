import { cookies } from "next/headers";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Nombre del cookie que guarda la obra elegida en el selector de la oficina.
export const COOKIE_OBRA = "obra_id";

type Obra = { id: string; nombre: string };
type ObraConEstado = Obra & { estado: string };

// Resuelve la obra "en foco" de la oficina. Orden de preferencia:
//   1. La obra elegida en el selector (cookie), si sigue viva.
//   2. Una obra en estado 'activa' (comportamiento histórico pre-multi-obra).
//   3. Cualquier obra viva.
// Sin ninguna → null (la página muestra el vacío). Cada página la re-resuelve
// porque en App Router el layout no puede pasar props a las páginas hijas.
export async function obraActiva(
  supabase: SupabaseServer,
): Promise<Obra | null> {
  const cookieStore = await cookies();
  const elegida = cookieStore.get(COOKIE_OBRA)?.value;

  if (elegida) {
    const { data } = await supabase
      .from("obras")
      .select("id, nombre")
      .eq("id", elegida)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return data;
    // El cookie apunta a una obra inexistente o borrada: seguir al fallback.
  }

  const { data: activa } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("estado", "activa")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (activa) return activa;

  const { data: cualquiera } = await supabase
    .from("obras")
    .select("id, nombre")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return cualquiera ?? null;
}

// Todas las obras vivas para poblar el selector (activas primero, luego por
// nombre). Admin ve todas por RLS.
export async function listarObras(
  supabase: SupabaseServer,
): Promise<ObraConEstado[]> {
  const { data } = await supabase
    .from("obras")
    .select("id, nombre, estado")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });
  const obras = data ?? [];
  return [...obras].sort((a, b) => {
    // Activas primero; dentro de cada grupo respeta el orden por nombre de arriba.
    if (a.estado === b.estado) return 0;
    return a.estado === "activa" ? -1 : b.estado === "activa" ? 1 : 0;
  });
}
