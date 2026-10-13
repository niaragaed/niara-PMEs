"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { VideoCover } from "@/components/entrar/VideoCover";
import { TextField } from "@/components/perfil/FormField";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { isValidEmail } from "@/lib/masks";
import { createClient } from "@/lib/supabase/client";
import { resolvePostLoginDestination } from "@/app/entrar/actions";
import type { AuthError } from "@supabase/supabase-js";
import { useDictionary } from "@/lib/i18n/client";

type FormErrors = { email?: string; password?: string };

// Só cobre os erros que signInWithPassword pode retornar — criação de conta
// (signUp) não acontece mais nesta tela, ver CadastroPage.tsx.
function mapAuthError(error: AuthError, t: Dictionary["signIn"]["errors"]): string {
  switch (error.code) {
    case "invalid_credentials":
      return t.invalidCredentials;
    default:
      return t.generic;
  }
}

// Ícone da Google — não existe em lucide-react (ícones genéricos, sem
// logos de marca); inline e aria-hidden porque o botão que o usa está
// desabilitado ("Em breve", ver regra "nada simulado pode parecer real").
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.96h5.52c-.24 1.44-1.68 4.2-5.52 4.2-3.32 0-6.03-2.75-6.03-6.14s2.71-6.14 6.03-6.14c1.89 0 3.16.8 3.89 1.5l2.65-2.55C16.94 3.4 14.68 2.4 12 2.4 6.98 2.4 2.9 6.5 2.9 11.52s4.08 9.12 9.1 9.12c5.25 0 8.73-3.69 8.73-8.89 0-.6-.07-1.05-.15-1.5H12z"
      />
    </svg>
  );
}

// Tela só de LOGIN (signInWithPassword) — criar conta é um fluxo à parte,
// ver "Criar conta" abaixo, que apenas navega para /cadastro (a tela
// dedicada de criação de conta + cadastro completo).
export function SignInPage({
  isFundraisingIntent,
  loginRequiredNotice,
}: {
  isFundraisingIntent: boolean;
  loginRequiredNotice?: boolean;
}) {
  const dict = useDictionary();
  const t = dict.signIn;
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!isValidEmail(email)) nextErrors.email = t.errors.invalidEmail;
    if (password.length < 6) nextErrors.password = t.errors.shortPassword;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setFormError(mapAuthError(error, t.errors));
      setPending(false);
      return;
    }

    try {
      router.refresh();
      // Sócios (conta sem linha em investors/issuers, ver resolveSocio()) vão direto para
      // /socios — senão cairiam no "completar cadastro" de /perfil. Para quem não é sócio,
      // /perfil redireciona pra /cadastro sozinho se a conta ainda não tiver dados de
      // investidor/empresa — cobre o caso de quem criou a conta mas não terminou o cadastro.
      const destination = await resolvePostLoginDestination();
      router.push(destination);
    } catch {
      // O login em si já foi concluído (signInWithPassword não deu erro) — uma falha aqui é
      // de rede/navegação, não de credencial. Sem este catch, uma falha transitória nessa
      // etapa deixava o botão travado em "Entrando…" para sempre, sem nenhuma mensagem: nada
      // chamava setPending(false) fora do branch de erro de login.
      setFormError(t.errors.generic);
      setPending(false);
    }
  }

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.push("/");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isFundraisingIntent ? t.fundraisingTitle : t.title}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-military lg:flex-row lg:overflow-hidden"
    >
      <Link
        href="/"
        aria-label={t.closeAriaLabel}
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-military/60 text-on-military transition-colors hover:bg-military/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-salmon"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </Link>

      <VideoCover />

      <div className="flex w-full flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10 lg:w-1/2 lg:p-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-on-military sm:text-3xl">
            {isFundraisingIntent ? t.fundraisingTitle : t.title}
          </h1>
          <p className="mt-2 text-sm text-on-military-muted">
            {isFundraisingIntent ? t.fundraisingSubtitle : t.subtitle}
          </p>

          {loginRequiredNotice && (
            <p className="mt-4 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
              {t.loginRequiredNotice}
            </p>
          )}

          <form onSubmit={handleSignIn} noValidate className="mt-8 flex flex-col gap-3">
            <TextField
              id="signin-email"
              label={t.email.label}
              type="email"
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              error={errors.email}
              placeholder={t.email.placeholder}
              autoComplete="email"
            />

            <TextField
              id="signin-password"
              label={t.password.label}
              type="password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              error={errors.password}
              placeholder={t.password.placeholder}
              autoComplete="current-password"
            />

            {formError && (
              <p role="alert" className="text-xs text-value-negative">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-salmon px-4 py-2.5 text-sm font-medium text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? t.signInPending : t.signInButton}
            </button>

            <Link
              href="/cadastro"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-panel-border bg-military px-4 py-2.5 text-sm font-medium text-on-military hover:bg-military-600/40"
            >
              {t.createAccountButton}
            </Link>

            <div className="flex items-center gap-3 py-1 text-xs text-on-military-muted">
              <span className="h-px flex-1 bg-panel-border" aria-hidden="true" />
              {t.or}
              <span className="h-px flex-1 bg-panel-border" aria-hidden="true" />
            </div>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title={dict.common.comingSoon}
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-panel-border bg-military px-4 py-2.5 text-sm font-medium text-on-military-muted"
            >
              <GoogleIcon />
              {t.google.continueButton}
              <span className="text-xs font-normal">({dict.common.comingSoon})</span>
            </button>
          </form>

          <p className="mt-6 text-[11px] text-on-military-muted">{t.termsNote}</p>
        </div>
      </div>
    </div>
  );
}
