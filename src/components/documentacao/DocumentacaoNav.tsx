import { ptBr } from "@/lib/i18n/pt-br";

const SECTIONS = [
  { id: "o-que-e", label: ptBr.documentacao.nav.oQueE },
  { id: "como-funciona", label: ptBr.documentacao.nav.comoFunciona },
  { id: "enquadramento", label: ptBr.documentacao.nav.enquadramento },
  { id: "modelo-receita", label: ptBr.documentacao.nav.modeloReceita },
  { id: "tecnologia", label: ptBr.documentacao.nav.tecnologia },
  { id: "faq", label: ptBr.documentacao.nav.faq },
];

export function DocumentacaoNav() {
  return (
    <>
      {/* Desktop: sidebar sticky */}
      <nav
        aria-label={ptBr.documentacao.nav.ariaLabel}
        className="hidden shrink-0 lg:sticky lg:top-24 lg:block lg:w-56"
      >
        <ul className="flex flex-col gap-1">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block rounded-md border-l-2 border-panel-border px-3 py-1.5 text-sm text-on-military-muted transition-colors hover:border-salmon hover:text-on-military"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile/tablet: abas horizontais roláveis */}
      <div
        role="tablist"
        aria-label={ptBr.documentacao.nav.ariaLabel}
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-panel-border px-4 pb-px sm:px-6 lg:hidden"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            role="tab"
            className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-xs font-medium text-on-military-muted transition-colors hover:border-salmon hover:text-on-military"
          >
            {section.label}
          </a>
        ))}
      </div>
    </>
  );
}
