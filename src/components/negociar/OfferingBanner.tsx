import Image from "next/image";
import { CATEGORY_META } from "@/lib/categories";
import type { TokenCategory } from "@/lib/mock/assets";

// `bannerUrl`/`logoUrl` come from two different sources: the 10 on-chain SMEs
// (getOfferingAssetPaths, src/lib/trade/offeringAssets.ts) always resolve a
// LOCAL path in public/negociar/pmes/<slug>/, which next/image optimizes with no
// extra configuration; the registered issuer's banner/logo (0010/
// 0011, issuerLogoUrl/issuerBannerUrl), on the other hand, is a REMOTE URL from the public
// Supabase Storage bucket — using next/image on it would require configuring
// `images.remotePatterns` in next.config.ts, which this project deliberately
// doesn't have (same pattern as LogoUpload.tsx/RealOfferCard.tsx: Storage content
// always via a plain <img>, never next/image). Detecting by the http(s)
// prefix avoids duplicating the component just because of the image's source.
function isRemoteUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

type OfferingBannerSize = "card" | "hero";

const BANNER_HEIGHT: Record<OfferingBannerSize, string> = {
  card: "h-32",
  hero: "h-48 sm:h-64",
};

const LOGO_DIMS: Record<OfferingBannerSize, string> = {
  card: "h-12 w-12",
  hero: "h-16 w-16 sm:h-20 sm:w-20",
};

const LOGO_ICON_DIMS: Record<OfferingBannerSize, string> = {
  card: "h-5 w-5",
  hero: "h-7 w-7 sm:h-9 sm:w-9",
};

const PLACEHOLDER_ICON_DIMS: Record<OfferingBannerSize, string> = {
  card: "h-10 w-10",
  hero: "h-14 w-14",
};

// An offering's photo banner + overlapping round logo — used both in the SME grid card
// (SmesOnChainCard.tsx, size="card") and at the top of any offering detail page
// (OfferingDetailPage.tsx, size="hero", all categories). `bannerUrl`/`logoUrl` come already
// resolved on the server (see src/lib/trade/offeringAssets.ts) — they're `null` when there's no
// real file (today only the 10 real SME offerings on Sepolia have photos generated with Gemini;
// the other categories never do), in which case it shows a placeholder with the same color/icon
// tokens already used by CategoryChip/CategoryBadge for the offering's own category.
export function OfferingBanner({
  bannerUrl,
  logoUrl,
  tradeName,
  category,
  size = "card",
}: {
  bannerUrl: string | null;
  logoUrl: string | null;
  tradeName: string;
  category: TokenCategory;
  size?: OfferingBannerSize;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  return (
    <div
      className={`relative w-full overflow-hidden ${BANNER_HEIGHT[size]}`}
      style={!bannerUrl ? { backgroundColor: meta.chipVar } : undefined}
    >
      {bannerUrl ? (
        isRemoteUrl(bannerUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element -- comes from the public Supabase Storage bucket, doesn't go through the next/image optimizer (see the comment above)
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Image src={bannerUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon className={PLACEHOLDER_ICON_DIMS[size]} style={{ color: meta.iconVar }} aria-hidden="true" />
        </div>
      )}

      <div
        className={`absolute bottom-3 left-3 flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface shadow-soft ${LOGO_DIMS[size]}`}
      >
        {logoUrl ? (
          isRemoteUrl(logoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element -- comes from the public Supabase Storage bucket, doesn't go through the next/image optimizer (see the comment above)
            <img src={logoUrl} alt={`${tradeName} — logo`} className="h-full w-full object-cover" />
          ) : (
            <Image src={logoUrl} alt={`${tradeName} — logo`} fill sizes="80px" className="object-cover" />
          )
        ) : (
          <Icon className={LOGO_ICON_DIMS[size]} style={{ color: meta.iconVar }} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
