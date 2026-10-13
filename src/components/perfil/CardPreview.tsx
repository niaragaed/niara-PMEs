import { Building2, Image as ImageIcon } from "lucide-react";

// A preview of how the issuer's banner + logo will appear on the real card in
// /negociar (the same visual composition as OfferingBanner.tsx size="card": banner
// h-32 + round h-12 logo overlapping the bottom-left corner) — without
// depending on TokenCategory (the issuer may not have any active offering
// yet in /perfil, so there's no category to color the placeholder; it uses
// the same neutral tokens as the rest of this screen). It exists to solve the
// same problem the uncropped previews of LogoUpload/BannerUpload only solve
// halfway: that preview shows the full image as
// uploaded, but not the CROP the public card applies — without this,
// the only way to find out whether the framing looked odd (e.g. the logo
// covering an important part of the banner) was to go check in /negociar.
export function CardPreview({ bannerUrl, logoUrl }: { bannerUrl: string | null; logoUrl: string | null }) {
  return (
    <div className="relative h-32 w-full max-w-sm overflow-hidden rounded-lg border border-panel-border bg-military-600/40">
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- comes from the public Supabase Storage bucket, doesn't go through the next/image optimizer
        <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-10 w-10 text-on-military-muted" aria-hidden="true" />
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface shadow-soft">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- comes from the public Supabase Storage bucket, doesn't go through the next/image optimizer
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-5 w-5 text-ink-muted" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
