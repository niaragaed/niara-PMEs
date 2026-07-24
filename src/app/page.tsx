import { ptBr } from "@/lib/i18n/pt-br";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-32 text-center">
      <span className="rounded-full bg-military-100 px-4 py-1 text-sm font-medium text-military">
        {ptBr.common.emConstrucao}
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-ink">
        {ptBr.meta.title}
      </h1>
      <p className="max-w-xl text-lg text-ink-muted">{ptBr.meta.description}</p>
      <p className="max-w-md text-sm text-ink-muted">
        {ptBr.common.avisoDemonstracao}
      </p>
    </main>
  );
}
