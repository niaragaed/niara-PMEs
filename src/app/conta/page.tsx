import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/conta/SignOutButton";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${ptBr.conta.meta.title} · Niara PMEs`,
  description: ptBr.conta.meta.description,
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ aviso?: "apenas-empresa" | "apenas-investidor" }>;
};

export default async function ContaPage({ searchParams }: PageProps) {
  const { aviso } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { role } = await resolveAccount();
  const t = ptBr.conta;

  const papelTexto =
    role === "investor" ? t.papelInvestidor : role === "issuer" ? t.papelEmpresa : t.papelNaoCadastrado;

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>

        {aviso === "apenas-empresa" && (
          <p className="mt-4 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
            {t.avisoApenasEmpresa}
          </p>
        )}
        {aviso === "apenas-investidor" && (
          <p className="mt-4 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
            {t.avisoApenasInvestidor}
          </p>
        )}

        <dl className="mt-8 flex flex-col gap-4 rounded-lg border border-panel-border bg-panel p-6">
          <div>
            <dt className="text-xs text-on-military-muted">{t.emailLabel}</dt>
            <dd className="mt-0.5 text-sm text-on-military">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.papelLabel}</dt>
            <dd className="mt-0.5 text-sm text-on-military">{papelTexto}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {!role && (
            <Link
              href="/cadastro"
              className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600"
            >
              {t.completarCadastroBotao}
            </Link>
          )}
          {role === "issuer" && (
            <Link
              href="/empresa/ofertas"
              className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon"
            >
              {t.minhasOfertasBotao}
            </Link>
          )}
          {role === "investor" && (
            <Link
              href="/investir"
              className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon"
            >
              {t.investirBotao}
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
