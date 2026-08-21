import { Building2, Image as ImageIcon } from "lucide-react";

// Prévia de como o banner + logo do emissor vão aparecer no card real de
// /negociar (mesma composição visual de OfertaBanner.tsx size="card": banner
// h-32 + logo circular h-12 sobreposta no canto inferior esquerdo) — sem
// depender de TokenCategory (o emissor pode não ter nenhuma oferta ativa
// ainda em /perfil, então não há categoria para colorir o placeholder; usa
// os mesmos tokens neutros do resto desta tela). Existe para resolver o
// mesmo problema que os previews sem corte de LogoUpload/BannerUpload já
// resolvem pela metade: aquele preview mostra a imagem completa como
// enviada, mas não mostra o RECORTE que o card público aplica — sem isto,
// só dava pra descobrir se o enquadramento ficou estranho (ex.: logo
// cobrindo parte importante do banner) depois de ir conferir em /negociar.
export function CardPreview({ bannerUrl, logoUrl }: { bannerUrl: string | null; logoUrl: string | null }) {
  return (
    <div className="relative h-32 w-full max-w-sm overflow-hidden rounded-lg border border-panel-border bg-military-600/40">
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- vem do bucket público do Supabase Storage, não passa pelo otimizador do next/image
        <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-10 w-10 text-on-military-muted" aria-hidden="true" />
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface shadow-soft">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- vem do bucket público do Supabase Storage, não passa pelo otimizador do next/image
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-5 w-5 text-ink-muted" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
