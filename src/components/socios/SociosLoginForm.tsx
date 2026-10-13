"use client";

// Sign-in for the /socios area — the usual mechanism (Supabase Auth,
// signInWithPassword via the browser client), just its own form, separate from
// /entrar (which is the investor/issuer sign-in). After authenticating, router.refresh() lets
// the Server Component in src/app/socios/page.tsx re-evaluate resolveSocio() (allowlist) — it
// doesn't redirect elsewhere, because "authenticated" and "authorized" are different things here.
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary } from "@/lib/i18n/client";

function mapAuthError(error: AuthError, t: Dictionary["partners"]["login"]["errors"]): string {
  if (error.code === "invalid_credentials") return t.invalidCredentials;
  return t.generic;
}

export function PartnersLoginForm() {
  const dict = useDictionary();
  const t = dict.partners.login;
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
