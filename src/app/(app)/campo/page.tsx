import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obraActiva, listarObras } from "@/lib/oficina/obra";
import SelectorObraCampo from "./SelectorObraCampo";

// Superficie mobile: elegir obra → elegir la etapa activa. Toda la carga cuelga
// de una etapa. Acá nunca se pide ni se muestra dinero.
const ESTADO_ETAPA: Record<string, { clase: string; etiqueta: string }> = {
  pendiente: { clase: "border-pending/50 bg-pending/10 text-muted", etiqueta: "Pendiente" },
  en_curso: { clase: "border-warn bg-warn/10 text-warn", etiqueta: "En curso" },
  terminada: { clase: "border-ok bg-ok/10 text-ok", etiqueta: "Terminada" },
};

export default async function CampoPage() {
  const supabase = await createClient();

  // Obra en foco por cookie (compartida con oficina) + lista para el selector.
  const [obra, obras] = await Promise.all([
    obraActiva(supabase),
    listarObras(supabase),
  ]);

  const { data: etapas } = obra
    ? await supabase
        .from("etapas")
        .select("id, nombre, orden, estado, gremios(nombre)")
        .eq("obra_id", obra.id)
        .is("deleted_at", null)
        .order("orden", { ascending: true })
    : { data: null };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-6">
      <h1 className="text-2xl font-bold text-ink">
        Obra{obra && <span className="ml-2 text-base font-normal text-muted">{obra.nombre}</span>}
      </h1>

      <SelectorObraCampo obras={obras} actual={obra?.id ?? null} />

      {!obra ? (
        <p className="py-8 text-center text-muted">
          No hay ninguna obra activa. Creala desde la oficina.
        </p>
      ) : (etapas ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted">
          Esta obra todavía no tiene etapas.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">Elegí la etapa en la que estás trabajando:</p>
          {(etapas ?? []).map((e) => {
            const estado = ESTADO_ETAPA[e.estado] ?? ESTADO_ETAPA.pendiente;
            const gremio = (e.gremios as { nombre: string } | null)?.nombre;
            return (
              <Link
                key={e.id}
                href={`/campo/etapa/${e.id}`}
                className={`flex min-h-16 items-center justify-between rounded-2xl border-2 px-5 ${estado.clase}`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-bold text-ink">{e.nombre}</span>
                  <span className="truncate text-sm text-muted">
                    {gremio ?? "Sin gremio asignado"}
                  </span>
                </div>
                <span className="ml-3 shrink-0 text-sm font-bold">{estado.etiqueta}</span>
              </Link>
            );
          })}
        </>
      )}

      <Link
        href="/oficina"
        className="mt-4 flex min-h-12 items-center justify-center rounded-xl text-sm text-muted active:bg-black/5"
      >
        🖥️ Ir a la oficina →
      </Link>
    </div>
  );
}
