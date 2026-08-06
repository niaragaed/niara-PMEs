import { ptBr } from "@/lib/i18n/pt-br";

const BASE_SECTIONS = [{ id: "dados-cadastro", label: ptBr.perfil.nav.dadosCadastro }];
const MINHAS_OFERTAS_SECTION = { id: "minhas-ofertas", label: ptBr.perfil.nav.minhasOfertas };
const REST_SECTIONS = [
  { id: "perfil-investidor", label: ptBr.perfil.nav.perfilInvestidor },
  { id: "carteira", label: ptBr.perfil.nav.carteira },
];

export function PerfilNav({ showMinhasOfertas }: { showMinhasOfertas: boolean }) {
  const SECTIONS = [
    ...BASE_SECTIONS,
    ...(showMinhasOfertas ? [MINHAS_OFERTAS_SECTION] : []),
    ...REST_SECTIONS,
  ];

  return (
    <>
      {/* Desktop: sidebar sticky */}
      <nav
        aria-label={ptBr.perfil.nav.ariaLabel}
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
        aria-label={ptBr.perfil.nav.ariaLabel}
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
