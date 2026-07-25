import type { Metadata } from "next";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = { title: `${ptBr.styleguide.title} · Niara PMEs` };

type Swatch = { label: string; hex: string; className: string };

const baseSwatches: Swatch[] = [
  { label: "bg", hex: "#FAF8F5", className: "bg-bg" },
  { label: "surface", hex: "#FFFFFF", className: "bg-surface" },
  { label: "surface-alt", hex: "#F1EEE6", className: "bg-surface-alt" },
  { label: "border", hex: "#E7E2D9", className: "bg-border" },
  { label: "ink", hex: "#23271F", className: "bg-ink" },
  { label: "ink-muted", hex: "#5C6152", className: "bg-ink-muted" },
];

const militarySwatches: Swatch[] = [
  { label: "military", hex: "#3E4835", className: "bg-military" },
  { label: "military-600", hex: "#4E5A42", className: "bg-military-600" },
  { label: "military-100", hex: "#E6EBDD", className: "bg-military-100" },
];

const salmonSwatches: Swatch[] = [
  { label: "salmon", hex: "#F0A487", className: "bg-salmon" },
  { label: "salmon-600", hex: "#E08E6F", className: "bg-salmon-600" },
  { label: "salmon-100", hex: "#FBE9DF", className: "bg-salmon-100" },
];

const accentSwatches: Swatch[] = [
  { label: "ink-peach", hex: "#8A5A47", className: "bg-ink-peach" },
  { label: "chip-sage", hex: "#DCE3CF", className: "bg-chip-sage" },
];

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {swatches.map((swatch) => (
        <div key={swatch.label} className="flex flex-col gap-2">
          <div className={`h-16 rounded-md border border-border ${swatch.className}`} />
          <div>
            <p className="text-sm text-ink">{swatch.label}</p>
            <p className="font-mono text-xs text-ink-muted">{swatch.hex}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-6 py-16">
      <header className="flex flex-col gap-2 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold text-ink">{ptBr.styleguide.title}</h1>
        <p className="text-ink-muted">{ptBr.styleguide.subtitle}</p>
      </header>

      <Section title={ptBr.styleguide.coresBase}>
        <SwatchGrid swatches={baseSwatches} />
      </Section>

      <Section title={ptBr.styleguide.verdeMilitar}>
        <SwatchGrid swatches={militarySwatches} />
      </Section>

      <Section title={ptBr.styleguide.salmao}>
        <SwatchGrid swatches={salmonSwatches} />
      </Section>

      <Section title={ptBr.styleguide.acentos}>
        <SwatchGrid swatches={accentSwatches} />
      </Section>

      <Section title={ptBr.styleguide.fundosAlternados}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-military-100 p-6">
            <p className="text-lg font-semibold text-ink">{ptBr.styleguide.fundoSalvia}</p>
          </div>
          <div className="rounded-lg bg-salmon-100 p-6">
            <p className="text-lg font-semibold text-ink">{ptBr.styleguide.fundoPessego}</p>
            <p className="mt-2 text-sm text-ink-peach">{ptBr.styleguide.fundoPessegoSubtitulo}</p>
          </div>
        </div>
      </Section>

      <Section title={ptBr.styleguide.tipografia}>
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-ink">Niara PMEs</h1>
          <p className="max-w-2xl text-base text-ink-muted">{ptBr.styleguide.tipografiaAmostra}</p>
        </div>
      </Section>

      <Section title={ptBr.styleguide.raiosSombras}>
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-sm border border-border bg-surface shadow-soft" />
            <span className="text-xs text-ink-muted">sm · 8px</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-md border border-border bg-surface shadow-soft" />
            <span className="text-xs text-ink-muted">md · 12px</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-lg border border-border bg-surface shadow-soft-lg" />
            <span className="text-xs text-ink-muted">lg · 20px</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-full border border-border bg-surface shadow-soft-lg" />
            <span className="text-xs text-ink-muted">full</span>
          </div>
        </div>
      </Section>

      <Section title={ptBr.styleguide.botoes}>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-salmon px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-salmon-600"
          >
            {ptBr.styleguide.botaoPrimario}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-military px-6 py-3 text-sm font-medium text-military transition-colors hover:bg-military-100"
          >
            {ptBr.styleguide.botaoSecundario}
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-salmon/50 px-6 py-3 text-sm font-medium text-ink/60"
          >
            {ptBr.styleguide.botaoDesabilitado}
          </button>
        </div>
      </Section>

      <Section title={ptBr.styleguide.cards}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-6 shadow-soft">
            <p className="text-lg font-semibold text-ink">{ptBr.styleguide.cardTitulo}</p>
            <p className="mt-2 text-sm text-ink-muted">{ptBr.styleguide.cardTexto}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-alt p-6">
            <p className="text-lg font-semibold text-ink">{ptBr.styleguide.cardTitulo}</p>
            <p className="mt-2 text-sm text-ink-muted">{ptBr.styleguide.cardTexto}</p>
          </div>
        </div>
      </Section>
    </main>
  );
}
