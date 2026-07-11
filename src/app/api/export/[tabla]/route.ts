import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Export legible para Cowork y planillas (principio #6: datos accesibles por
// API). Tablas y columnas ya están en español. Solo admin y solo lectura.
// GET /api/export/gastos            → JSON
// GET /api/export/gastos?formato=csv → CSV descargable
// Filtro opcional: ?obra=<uuid>.
const EXPORTABLES = [
  "obras",
  "etapas",
  "rubros",
  "gastos",
  "compromisos",
  "ingresos",
  "adicionales",
  "vencimientos_admin",
  "tareas",
  "personal",
  "asistencias",
  "materiales",
  "pedidos_materiales",
  "diario_obra",
] as const;

type Exportable = (typeof EXPORTABLES)[number];

function aCSV(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) return "";
  const columnas = Object.keys(filas[0]);
  const escapar = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [
    columnas.join(","),
    ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(",")),
  ].join("\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tabla: string }> },
) {
  const { tabla } = await params;
  if (!EXPORTABLES.includes(tabla as Exportable)) {
    return NextResponse.json({ error: "Tabla no exportable" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const obraId = url.searchParams.get("obra");

  // La tabla es dinámica (ya validada contra EXPORTABLES), así que el tipado
  // por-tabla del cliente no aplica al filtro obra_id: cast a una consulta
  // mínima, misma defensa en runtime que usa actualizarCampo.
  type ConsultaExport = PromiseLike<{
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  }> & { eq: (columna: string, valor: string) => ConsultaExport };

  let query = supabase
    .from(tabla as Exportable)
    .select("*")
    .order("created_at", { ascending: true }) as unknown as ConsultaExport;
  // Todas las exportables menos `obras` tienen obra_id.
  if (obraId && tabla !== "obras") query = query.eq("obra_id", obraId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (url.searchParams.get("formato") === "csv") {
    return new NextResponse(aCSV(data ?? []), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tabla}.csv"`,
      },
    });
  }
  return NextResponse.json({ tabla, filas: data ?? [] });
}
