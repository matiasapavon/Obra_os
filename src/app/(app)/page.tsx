import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Launcher del home. Campo entra directo a su superficie (mobile = capturar);
// admin elige entre Campo y Oficina (desktop = gestionar/entender).
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/campo");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-16 text-center">
      <div className="text-5xl">🏗️</div>
      <h1 className="text-2xl font-bold text-ink">¿Dónde vas a trabajar?</h1>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/campo"
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-brand/40 bg-brand/5 px-5"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div className="flex flex-col text-left">
              <span className="text-lg font-bold text-ink">Campo</span>
              <span className="text-sm text-muted">Cargar el día en obra</span>
            </div>
          </div>
          <span className="text-2xl text-brand">→</span>
        </Link>

        <Link
          href="/oficina"
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-black/10 px-5"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗂️</span>
            <div className="flex flex-col text-left">
              <span className="text-lg font-bold text-ink">Oficina</span>
              <span className="text-sm text-muted">Gestionar y entender</span>
            </div>
          </div>
          <span className="text-2xl text-brand">→</span>
        </Link>
      </div>
    </div>
  );
}
