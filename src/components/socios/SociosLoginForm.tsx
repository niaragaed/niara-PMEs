"use client";

// Login da área /socios — mesmo mecanismo de sempre (Supabase Auth,
// signInWithPassword via client do navegador), só um formulário próprio, separado de
// /entrar (que é o login de investidor/emissor). Depois de autenticar, router.refresh() deixa
// o Server Component de src/app/socios/page.tsx reavaliar resolveSocio() (allowlist) — não
// redireciona pra outro lugar, porque "autenticado" e "autorizado" são coisas diferentes aqui.
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { pt } from "@/lib/i18n/pt-br";

function mapAuthError(error: AuthError, t: typeof pt.partners.login.errors): string {
  if (error.code === "invalid_credentials") return t.invalidCredentials;
  return t.generic;
}

export function PartnersLoginForm() {
  const t = pt.partners.login;
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(mapAuthError(error, t.errors));
      setPending(false);
      return;
    }

    router.refresh();
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-on-military-muted">{t.emailLabel}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-on-military-muted">{t.passwordLabel}</span>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-value-negative">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t.signingInButton : t.signInButton}
      </button>
    </form>
  );
}
