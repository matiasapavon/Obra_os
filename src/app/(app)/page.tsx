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
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        ¿Dónde vas a trabajar?
      </h1>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/campo"
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-brand/40 bg-brand/5 px-5 shadow-card transition-colors active:bg-brand/10"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <IconoCelular />
            </span>
            <div className="flex flex-col text-left">
              <span className="text-lg font-bold text-ink">Campo</span>
              <span className="text-sm text-muted">Cargar el día en obra</span>
            </div>
          </div>
          <Chevron />
        </Link>

        <Link
          href="/oficina"
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-line px-5 shadow-card transition-colors active:bg-surface"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-muted">
              <IconoMonitor />
            </span>
            <div className="flex flex-col text-left">
              <span className="text-lg font-bold text-ink">Oficina</span>
              <span className="text-sm text-muted">Gestionar y entender</span>
            </div>
          </div>
          <Chevron />
        </Link>
      </div>
    </div>
  );
}

// Íconos propios (SVG inline, trazo 2px consistente): sin emojis en la UI y
// sin sets de terceros. aria-hidden: el texto del link ya describe el destino.
function IconoCelular() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-6 w-6"
    >
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function IconoMonitor() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-6 w-6"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-brand"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
