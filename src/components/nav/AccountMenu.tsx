"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Building2, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ptBr } from "@/lib/i18n/pt-br";
import type { HeaderAccount } from "@/lib/nav/headerAccount";

function AccountAvatar({ account }: { account: HeaderAccount }) {
  if (account.role === "issuer" && account.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- vem do bucket público do Supabase Storage, não passa pelo otimizador do next/image
      <img src={account.logoUrl} alt="" className="h-full w-full object-cover" />
    );
  }
  const Icon = account.role === "issuer" ? Building2 : User;
  return <Icon className="h-4 w-4 text-ink-muted" aria-hidden="true" />;
}

// Substitui o link estático "Entrar" do Header quando há sessão — mostra a
// logo da empresa (issuer) ou um ícone genérico (investidor: a foto de
// perfil dele é 100% local/simulada, nunca salva — ver AvatarUpload.tsx —
// então não há nada persistido pra mostrar aqui com confiança entre
// navegações). Mesmo padrão de interação de NavDropdown.tsx (Esc + clique
// fora fecham), mas abre só no clique — é uma ação de conta, não navegação,
// não faz sentido abrir no hover.
export function AccountMenu({ account }: { account: HeaderAccount }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const router = useRouter();
  const t = ptBr.nav.contaMenu;

  const closeNow = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNow();
    }
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeNow();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, closeNow]);

  // router.refresh() é o que faz o Header (Server Component, ver
  // headerAccount.ts) reconsultar a sessão e voltar a mostrar "Entrar" — sem
  // isso, o avatar continuaria aparecendo até a próxima navegação normal.
  async function handleSignOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    closeNow();
    router.refresh();
    setPending(false);
  }

  async function handleSwitchAccount() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    closeNow();
    router.push("/entrar");
    router.refresh();
    setPending(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t.abrirMenu}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-alt transition-colors hover:border-salmon"
      >
        <AccountAvatar account={account} />
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label={t.abrirMenu}
          className="absolute right-0 top-full z-40 mt-3 w-56 animate-dropdown rounded-lg border border-border bg-surface p-2 shadow-soft-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleSwitchAccount}
            disabled={pending}
            className="flex w-full items-center gap-2.5 rounded-md p-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowRightLeft className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {t.entrarOutraConta}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={pending}
            className="flex w-full items-center gap-2.5 rounded-md p-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {pending ? t.saindo : t.sair}
          </button>
        </div>
      )}
    </div>
  );
}
