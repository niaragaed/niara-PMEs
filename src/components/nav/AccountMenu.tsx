"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Building2, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { HeaderAccount } from "@/lib/nav/headerAccount";
import { useDictionary } from "@/lib/i18n/client";

function AccountAvatar({ account }: { account: HeaderAccount }) {
  if (account.role === "issuer" && account.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- comes from the public Supabase Storage bucket, doesn't go through the next/image optimizer
      <img src={account.logoUrl} alt="" className="h-full w-full object-cover" />
    );
  }
  const Icon = account.role === "issuer" ? Building2 : User;
  return <Icon className="h-4 w-4 text-ink-muted" aria-hidden="true" />;
}

// Replaces the Header's static "Sign in" link when there's a session — shows the
// company's logo (issuer) or a generic icon (investor: their profile
// photo is 100% local/simulated, never saved — see AvatarUpload.tsx —
// so there's nothing persisted to show here reliably across
// navigations). Same interaction pattern as NavDropdown.tsx (Esc + click
// outside close it), but it only opens on click — it's an account action, not navigation,
// so opening on hover makes no sense.
export function AccountMenu({ account }: { account: HeaderAccount }) {
  const dict = useDictionary();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const router = useRouter();
  const t = dict.nav.accountMenu;

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

  // router.refresh() is what makes the Header (a Server Component, see
  // headerAccount.ts) re-check the session and show "Sign in" again — without
  // it, the avatar would keep showing until the next normal navigation.
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
        aria-label={t.openMenu}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface-alt py-1 pl-3 pr-1 transition-colors hover:border-salmon"
      >
        {account.name && (
          <span className="max-w-[10rem] truncate text-sm font-medium text-ink">{account.name}</span>
        )}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface">
          <AccountAvatar account={account} />
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label={t.openMenu}
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
            {t.signInOtherAccount}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={pending}
            className="flex w-full items-center gap-2.5 rounded-md p-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {pending ? t.signingOut : t.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
