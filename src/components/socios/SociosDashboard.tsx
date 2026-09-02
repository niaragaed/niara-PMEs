import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { SignOutButton } from "@/components/conta/SignOutButton";
import { ptBr } from "@/lib/i18n/pt-br";

export function KpiCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-panel-border bg-panel p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-on-military">{value}</p>
      {note && <p className="mt-1 text-xs text-on-military-muted">{note}</p>}
    </div>
  );
}

export function OrigemBadge({ real }: { real: boolean }) {
  const t = ptBr.socios.origem;
  return real ? (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-2.5 py-0.5 text-xs font-semibold text-on-salmon">
      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
      {t.real}
    </span>
  ) : (
    <span className="inline-flex w-fit items-center rounded-full border border-panel-border px-2.5 py-0.5 text-xs font-medium text-on-military-muted">
      {t.mock}
    </span>
  );
}

export function SociosDashboard({
  email,
  movimentacoesSlot,
}: {
  email: string;
  movimentacoesSlot: ReactNode;
}) {
  const t = ptBr.socios;

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{t.banner.label}</span> — {t.banner.text}
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
            <p className="mt-1 text-sm text-on-military-muted">
              {t.logadoComo} {email}
            </p>
          </div>
          <SignOutButton />
        </div>

        {/* Resumo + timeline única (on-chain real + off-chain/Supabase), streamed via Suspense
            (ver page.tsx) */}
        {movimentacoesSlot}
      </div>
    </main>
  );
}
