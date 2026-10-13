"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { removeIssuerBanner, uploadIssuerBanner } from "@/app/perfil/actions";
import { useDictionary } from "@/lib/i18n/client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 3 * 1024 * 1024;

// The same structure as LogoUpload.tsx (same UX pattern: hidden input +
// button + loading state), but the preview has a wide aspect ratio
// (cover banner), not a square one. The upload is real: it goes to Storage
// (the 'issuer-banners' bucket) and is stored in issuers.banner_path via a server
// action. The validation here is just a UX courtesy — the authority is the server
// (uploadIssuerBanner, src/app/perfil/actions.ts).
// `onUrlChange` is optional — used only by PersonalDataSection to keep the
// "Card preview" (CardPreview.tsx) in sync in real time, without making
// this component controlled (the real state stays local here).
export function BannerUpload({
  initialBannerUrl,
  onUrlChange,
}: {
  initialBannerUrl: string | null;
  onUrlChange?: (url: string | null) => void;
}) {
  const dict = useDictionary();
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
  const [error, setError] = useState<string | null>(null);
  const [justDid, setJustDid] = useState<"uploaded" | "removed" | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const t = dict.profile.registrationData.companyBanner;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t.invalidType);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(t.tooLarge);
      return;
    }

    setError(null);
    setJustDid(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadIssuerBanner(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setBannerUrl(result.bannerUrl);
      onUrlChange?.(result.bannerUrl);
      setJustDid("uploaded");
    });
  }

  function handleRemove() {
    setError(null);
    setJustDid(null);
    startTransition(async () => {
      const result = await removeIssuerBanner();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setBannerUrl(null);
      onUrlChange?.(null);
      setJustDid("removed");
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-on-military">{t.title}</h3>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>

      {/* max-w-sm, the same as CardPreview.tsx on purpose — object-cover crops according to the
          container's aspect ratio, and the real card in /negociar has this width, not the panel's
          full width; without it, this preview shows a different crop from the real one. */}
      <div className="mt-3 flex h-32 w-full max-w-sm items-center justify-center overflow-hidden rounded-lg border border-panel-border bg-military-600/40">
        {bannerUrl ? (
          // object-cover on purpose — the same crop as the public card in /negociar (see
          // CardPreview.tsx, which composes this banner with the logo exactly as there).
          // eslint-disable-next-line @next/next/no-img-element -- comes from the public Supabase Storage bucket, doesn't go through the next/image optimizer
          <img src={bannerUrl} alt={t.bannerAlt} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8 text-on-military-muted" aria-hidden="true" />
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {isPending ? t.sending : bannerUrl ? t.changeLabel : t.sendLabel}
          </button>
          {bannerUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military-muted hover:border-value-negative hover:text-value-negative disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t.removeLabel}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-label={t.selectLabel}
        />
        <p className="text-[11px] text-on-military-muted">{t.hint}</p>
        {error && (
          <p role="alert" className="text-xs text-value-negative">
            {error}
          </p>
        )}
        {justDid === "uploaded" && !error && <p className="text-xs text-value-positive">{t.successSent}</p>}
        {justDid === "removed" && !error && <p className="text-xs text-value-positive">{t.successRemoved}</p>}
      </div>
    </div>
  );
}
