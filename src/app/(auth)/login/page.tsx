"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Estado = "idle" | "entrando" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("entrando");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setEstado("error");
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Obra OS</h1>
        <p className="mt-2 text-muted">Gestión de obra, de campo a oficina.</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Tu mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@ejemplo.com"
              className="h-14 rounded-xl border border-black/15 bg-paper px-4 text-lg text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Contraseña</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-14 rounded-xl border border-black/15 bg-paper px-4 text-lg text-ink outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={estado === "entrando"}
            className="h-14 rounded-xl bg-brand text-lg font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {estado === "entrando" ? "Entrando…" : "Entrar"}
          </button>
          {estado === "error" && (
            <p className="text-sm text-alert">No se pudo entrar: {error}</p>
          )}
        </form>
      </div>
    </main>
  );
}
