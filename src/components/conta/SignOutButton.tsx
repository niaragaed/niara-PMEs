"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ptBr } from "@/lib/i18n/pt-br";

export function SignOutButton() {
  const [supabase] = useState(() => createClient());
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setPending(true);
    await supabase.auth.signOut();
    router.refresh();
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? ptBr.conta.sairPendente : ptBr.conta.sairBotao}
    </button>
  );
}
