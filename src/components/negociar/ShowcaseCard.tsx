import Link from "next/link";
import { CategoryBadge } from "./CategoryChip";
import { ptBr } from "@/lib/i18n/pt-br";
import type { Oferta } from "@/lib/mock/ofertas";

// Card de "vitrine (demonstração)" — reutilizado no hub e no template de
// categoria. Card branco sobre o fundo military cheio das telas /negociar.
export function ShowcaseCard({ oferta }: { oferta: Oferta }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-lg bg-surface p-5 shadow-soft">
      <CategoryBadge categoria={oferta.categoria} />
      <h3 className="text-sm font-semibold text-ink">{oferta.nome}</h3>
      <p className="flex-1 text-xs font-medium text-ink-muted">{ptBr.negociar.vitrine.tagExemplo}</p>
      <Link
        href={`/negociar/oferta/${oferta.slug}`}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-salmon px-4 py-2 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600"
      >
        {ptBr.negociar.vitrine.verDetalhes}
      </Link>
    </div>
  );
}
