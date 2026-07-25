import Link from "next/link";
import type { ReactNode } from "react";

type SectionCardProps = {
  chip: ReactNode;
  title: string;
  description: string;
  href?: string;
};

// Card branco com um chip (número ou ícone) atrás/acima do título, usado
// nas seções de conteúdo aprovado (Benefícios, Quando usar, Tokens).
export function SectionCard({ chip, title, description, href }: SectionCardProps) {
  const content = (
    <>
      <span className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chip-sage text-sm font-semibold text-ink">
        {chip}
      </span>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex h-full flex-col rounded-lg bg-surface p-6 shadow-soft transition-shadow hover:shadow-soft-lg"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex h-full flex-col rounded-lg bg-surface p-6 shadow-soft">{content}</div>;
}
