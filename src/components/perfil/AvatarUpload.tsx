"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Trash2, User } from "lucide-react";
import { useDictionary } from "@/lib/i18n/client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export function AvatarUpload() {
  const dict = useDictionary();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = dict.profile.registrationData.avatar;

  // the photo never leaves the browser — we only create a local object URL, which
  // has to be revoked when switching images or unmounting the component
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t.invalidType);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(t.tooLarge);
      return;
    }

    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function handleRemove() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setError(null);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-panel-border bg-military-600/40">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL; does not go through the next/image optimizer
          <img src={previewUrl} alt={t.photoAlt} className="h-full w-full object-cover" />
        ) : (
          <User className="h-8 w-8 text-on-military-muted" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military hover:border-salmon"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            {t.changeLabel}
          </button>
          {previewUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military-muted hover:border-value-negative hover:text-value-negative"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t.removeLabel}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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
      </div>
    </div>
  );
}
