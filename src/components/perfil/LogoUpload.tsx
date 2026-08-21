"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Building2, Trash2, Upload } from "lucide-react";
import { removeIssuerLogo, uploadIssuerLogo } from "@/app/perfil/actions";
import { ptBr } from "@/lib/i18n/pt-br";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

// Diferente do AvatarUpload (foto de perfil, 100% local/simulada), a logo é
// da empresa, pública, e o envio é real: sobe pro Storage e grava em
// issuers.logo_path via server action. A validação aqui é só cortesia de UX
// — a autoridade é o servidor (uploadIssuerLogo, src/app/perfil/actions.ts).
// `onUrlChange` é opcional — usado só por PersonalDataSection para manter a
// "Prévia do card" (CardPreview.tsx) sincronizada em tempo real, sem tornar
// este componente controlado (o estado de verdade continua local aqui).
export function LogoUpload({
  initialLogoUrl,
  onUrlChange,
}: {
  initialLogoUrl: string | null;
  onUrlChange?: (url: string | null) => void;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [error, setError] = useState<string | null>(null);
  const [justDid, setJustDid] = useState<"enviada" | "removida" | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const t = ptBr.perfil.dadosCadastro.logoEmpresa;

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
      const result = await uploadIssuerLogo(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setLogoUrl(result.logoUrl);
      onUrlChange?.(result.logoUrl);
      setJustDid("enviada");
    });
  }

  function handleRemove() {
    setError(null);
    setJustDid(null);
    startTransition(async () => {
      const result = await removeIssuerLogo();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setLogoUrl(null);
      onUrlChange?.(null);
      setJustDid("removida");
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-on-military">{t.title}</h3>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>

      <div className="mt-3 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-panel-border bg-military-600/40">
          {logoUrl ? (
            // object-cover de propósito — mesmo recorte do card circular público (CardPreview.tsx
            // reforça isso compondo banner+logo juntos; aqui é só a logo sozinha).
            // eslint-disable-next-line @next/next/no-img-element -- vem do bucket público do Supabase Storage, não passa pelo otimizador do next/image
            <img src={logoUrl} alt={t.logoAlt} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-8 w-8 text-on-military-muted" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {isPending ? t.enviando : logoUrl ? t.changeLabel : t.sendLabel}
            </button>
            {logoUrl && (
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
          {justDid === "enviada" && !error && <p className="text-xs text-value-positive">{t.sucessoEnviada}</p>}
          {justDid === "removida" && !error && <p className="text-xs text-value-positive">{t.sucessoRemovida}</p>}
        </div>
      </div>
    </div>
  );
}
