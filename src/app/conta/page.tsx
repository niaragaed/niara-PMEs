import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/conta/SignOutButton";
import { resolveInvestor } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${ptBr.conta.meta.title} · Niara PMEs`,
  description: ptBr.conta.meta.description,
  robots: { index: false, follow: false },
};

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { investorId } = await resolveInvestor();
  const t = ptBr.conta;

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>

        <dl className="mt-8 flex flex-col gap-4 rounded-lg border border-panel-border bg-panel p-6">
          <div>
            <dt className="text-xs text-on-military-muted">{t.emailLabel}</dt>
            <dd className="mt-0.5 text-sm text-on-military">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.investidorLabel}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {investorId ? t.investidorCadastrado : t.investidorNaoCadastrado}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
