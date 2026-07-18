import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obraActiva, listarObras } from "@/lib/oficina/obra";
import OficinaNav from "./OficinaNav";
import SelectorObra from "./SelectorObra";
import FormAlta from "@/components/oficina/FormAlta";

// Superficie desktop: gestionar y entender. Gate admin acá (la plata SOLO en
// desktop y solo admin; campo nunca entra a /oficina). Igual que en el resto de
// server actions, la autorización se re-chequea en cada mutación, no solo acá.
export default async function OficinaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El (app)/layout padre ya exige sesión, pero no confiamos en el orden.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/campo");

  // Obra en foco + lista para el selector (una sola vez, para el header).
  const [obra, obras] = await Promise.all([
    obraActiva(supabase),
    listarObras(supabase),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-muted">
            Oficina ·{" "}
            <Link href="/campo" className="font-normal underline-offset-2 hover:underline">
              ir a campo
            </Link>
          </span>
          <h1 className="text-2xl font-bold text-ink">
            {obra ? obra.nombre : "No hay ninguna obra activa"}
          </h1>
        </div>
        <div className="flex items-start gap-3">
          <SelectorObra obras={obras} actual={obra?.id ?? null} />
          <FormAlta
            tabla="obras"
            etiqueta="Obra"
            campos={[
              { key: "nombre", label: "Nombre", requerido: true },
              { key: "cliente", label: "Cliente" },
              { key: "direccion", label: "Dirección" },
            ]}
          />
        </div>
      </header>
      <OficinaNav />
      <div className="mt-4">{children}</div>
    </div>
  );
}
