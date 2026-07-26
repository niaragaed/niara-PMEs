"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { VideoCover } from "@/components/entrar/VideoCover";
import { ptBr } from "@/lib/i18n/pt-br";

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

export function EntrarPage({ isCaptacaoIntent }: { isCaptacaoIntent: boolean }) {
  const t = ptBr.entrar;
  const router = useRouter();

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
      aria-label={isCaptacaoIntent ? t.tituloCaptacao : t.titulo}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-military lg:flex-row lg:overflow-hidden"
    >
      <Link
        href="/"
        aria-label={t.fecharAriaLabel}
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-military/60 text-on-military transition-colors hover:bg-military/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-salmon"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </Link>

      <VideoCover />

      <div className="flex w-full flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10 lg:w-1/2 lg:p-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-on-military sm:text-3xl">
            {isCaptacaoIntent ? t.tituloCaptacao : t.titulo}
          </h1>
          <p className="mt-2 text-sm text-on-military-muted">
            {isCaptacaoIntent ? t.subtituloCaptacao : t.subtitulo}
          </p>

          <div className="mt-8">
            <ConnectWallet connectLabel={t.metamask.conectarBotao} connectButtonClassName="w-full justify-center py-3" />
            <p className="mt-2 text-xs text-on-military-muted">{t.metamask.dica}</p>
          </div>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-panel-border" />
            <span className="text-xs uppercase tracking-wide text-on-military-muted">{t.ou}</span>
            <span className="h-px flex-1 bg-panel-border" />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="entrar-email" className="mb-1 block text-xs text-on-military-muted">
                {t.email.label}
              </label>
              <input
                id="entrar-email"
                type="email"
                disabled
                placeholder={t.email.placeholder}
                className="w-full rounded-md border border-panel-border bg-military px-3 py-2 text-sm text-on-military placeholder:text-on-military-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title={ptBr.common.emBreve}
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-salmon/50 px-4 py-2.5 text-sm font-medium text-on-salmon/70"
            >
              {t.email.continuarBotao}
              <span className="text-xs font-normal">({ptBr.common.emBreve})</span>
            </button>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title={ptBr.common.emBreve}
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-panel-border bg-military px-4 py-2.5 text-sm font-medium text-on-military-muted"
            >
              <GoogleIcon />
              {t.google.continuarBotao}
              <span className="text-xs font-normal">({ptBr.common.emBreve})</span>
            </button>
          </div>

          <p className="mt-6 text-[11px] text-on-military-muted">{t.termosNota}</p>
        </div>
      </div>
    </div>
  );
}
