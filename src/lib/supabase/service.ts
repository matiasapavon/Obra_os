import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente con la SECRET key (saltea RLS). SOLO para el reporte público
// /r/[token], que corre 100% en server y consulta únicamente tablas sin plata
// filtrando por token. El import de "server-only" hace imposible que este
// módulo termine en un bundle de cliente.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY en el entorno (Supabase > API Keys > secret).",
    );
  }
  return createSupabaseClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
