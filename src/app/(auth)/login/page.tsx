"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Estado = "idle" | "enviando" | "enviado" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setEstado("error");
      setError(error.message);
    } else {
      setEstado("enviado");
    }
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Obra OS</h1>
        <p className="mt-2 text-muted">Gestión de obra, de campo a oficina.</p>

        {estado === "enviado" ? (
          <div className="mt-8 rounded-xl border border-ok/30 bg-ok/10 p-5">
            <p className="font-semibold text-ink">Revisá tu correo 📬</p>
            <p className="mt-1 text-sm text-muted">
              Te mandamos un link a <span className="font-medium">{email}</span>.
              Abrilo desde este mismo dispositivo para entrar.
            </p>
          </div>
        ) : (
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
            <button
              type="submit"
              disabled={estado === "enviando"}
              className="h-14 rounded-xl bg-brand text-lg font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {estado === "enviando" ? "Enviando…" : "Entrar con mi mail"}
            </button>
            {estado === "error" && (
              <p className="text-sm text-alert">No se pudo enviar: {error}</p>
            )}
            <p className="text-center text-xs text-muted">
              Sin contraseñas. Te llega un link mágico por mail.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
