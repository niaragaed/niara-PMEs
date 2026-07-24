import { ShieldAlert } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { ptBr } from "@/lib/i18n/pt-br";

export function TrustNoticeSection() {
  return (
    <section className="px-6 py-12">
      <Reveal className="mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-border bg-surface-alt p-6">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-military" aria-hidden="true" />
        <p className="text-sm text-ink-muted">{ptBr.sections.trustNotice.text}</p>
      </Reveal>
    </section>
  );
}
