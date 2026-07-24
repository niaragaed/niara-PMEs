import { ptBr } from "@/lib/i18n/pt-br";

export function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-32 text-center">
      <span className="rounded-full bg-military-100 px-4 py-1 text-sm font-medium text-military">
        {ptBr.common.emConstrucao}
      </span>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="text-ink-muted">{description}</p>
    </main>
  );
}
