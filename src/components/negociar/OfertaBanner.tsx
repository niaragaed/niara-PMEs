import Image from "next/image";
import { CATEGORY_META } from "@/lib/categories";
import type { TokenCategory } from "@/lib/mock/ativos";

type OfertaBannerSize = "card" | "hero";

const BANNER_HEIGHT: Record<OfertaBannerSize, string> = {
  card: "h-32",
  hero: "h-48 sm:h-64",
};

const LOGO_DIMS: Record<OfertaBannerSize, string> = {
  card: "h-12 w-12",
  hero: "h-16 w-16 sm:h-20 sm:w-20",
};

const LOGO_ICON_DIMS: Record<OfertaBannerSize, string> = {
  card: "h-5 w-5",
  hero: "h-7 w-7 sm:h-9 sm:w-9",
};

const PLACEHOLDER_ICON_DIMS: Record<OfertaBannerSize, string> = {
  card: "h-10 w-10",
  hero: "h-14 w-14",
};

// Banner de foto + logo circular sobreposto de uma oferta — usado tanto no card da grade PMEs
// (PmesOnChainCard.tsx, size="card") quanto no topo de qualquer página de detalhe de oferta
// (OfertaDetailPage.tsx, size="hero", todas as categorias). `bannerUrl`/`logoUrl` já vêm
// resolvidos no servidor (ver src/lib/negociar/ofertaAssets.ts) — ficam `null` quando não há
// arquivo real (hoje só as 10 ofertas PMEs reais em Sepolia têm fotos geradas no Gemini; as
// outras categorias nunca têm), caso em que mostra um placeholder com os mesmos tokens de
// cor/ícone já usados por CategoryChip/CategoryBadge para a categoria da própria oferta.
export function OfertaBanner({
  bannerUrl,
  logoUrl,
  nomeFantasia,
  categoria,
  size = "card",
}: {
  bannerUrl: string | null;
  logoUrl: string | null;
  nomeFantasia: string;
  categoria: TokenCategory;
  size?: OfertaBannerSize;
}) {
  const meta = CATEGORY_META[categoria];
  const Icon = meta.icon;

  return (
    <div
      className={`relative w-full overflow-hidden ${BANNER_HEIGHT[size]}`}
      style={!bannerUrl ? { backgroundColor: meta.chipVar } : undefined}
    >
      {bannerUrl ? (
        <Image src={bannerUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon className={PLACEHOLDER_ICON_DIMS[size]} style={{ color: meta.iconVar }} aria-hidden="true" />
        </div>
      )}

      <div
        className={`absolute bottom-3 left-3 flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface shadow-soft ${LOGO_DIMS[size]}`}
      >
        {logoUrl ? (
          <Image src={logoUrl} alt={`${nomeFantasia} — logo`} fill sizes="80px" className="object-cover" />
        ) : (
          <Icon className={LOGO_ICON_DIMS[size]} style={{ color: meta.iconVar }} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
