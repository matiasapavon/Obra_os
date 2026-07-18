import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, role")
    .eq("id", user.id)
    .maybeSingle();

  const nombre = profile?.nombre ?? user.email?.split("@")[0] ?? "";

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-brand">Obra OS</span>
          <span className="text-xs text-muted">Hola, {nombre}</span>
        </div>
        <LogoutButton />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
