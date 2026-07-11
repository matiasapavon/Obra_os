"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_OBRA } from "./obra";

const UN_ANIO = 60 * 60 * 24 * 365;

// Setea la obra en foco de la oficina (cookie) y revalida todo el árbol de
// /oficina. Admin-only: mismo re-chequeo que el resto de los server actions.
export async function seleccionarObra(
  obraId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

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

  // Validar que la obra existe y no está borrada antes de fijarla.
  const { data: obra } = await supabase
    .from("obras")
    .select("id")
    .eq("id", obraId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!obra) return { ok: false, error: "Obra inexistente" };

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_OBRA, obraId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UN_ANIO,
  });

  revalidatePath("/oficina", "layout");
  return { ok: true };
}
