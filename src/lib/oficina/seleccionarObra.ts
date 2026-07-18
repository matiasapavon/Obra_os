"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_OBRA } from "./obra";

const UN_ANIO = 60 * 60 * 24 * 365;

// Setea la obra en foco (cookie) y revalida /oficina y /campo. Cualquier
// usuario autenticado puede elegir su obra: la cookie es personal y solo
// cambia qué obra ve ÉL; qué obras puede ver lo decide RLS, no esto.
export async function seleccionarObra(
  obraId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

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
  revalidatePath("/campo", "layout");
  return { ok: true };
}
