import "server-only";
import fs from "node:fs";
import path from "node:path";

export type OfertaAssetPaths = {
  bannerUrl: string | null;
  logoUrl: string | null;
};

// Só chamado de Server Components (page.tsx / CategoryPage.tsx / HubPage.tsx) — fs.existsSync
// não roda em "use client". Convenção de caminho: public/negociar/pmes/<slug>/banner.jpg (foto,
// recomendado ~3:1) e logo.png (selo circular, com transparência — o recorte circular é feito
// via CSS, não precisa vir pronto no arquivo). Soltar os arquivos reais (gerados no Gemini) nessas
// pastas é suficiente para trocar o placeholder pela imagem de verdade — nenhuma mudança de
// código, só um novo commit/deploy (public/ é empacotado no build, não é lido em runtime).
export function getOfertaAssetPaths(slug: string): OfertaAssetPaths {
  const dir = path.join(process.cwd(), "public", "negociar", "pmes", slug);
  const bannerFsPath = path.join(dir, "banner.jpg");
  const logoFsPath = path.join(dir, "logo.png");

  return {
    bannerUrl: fs.existsSync(bannerFsPath) ? `/negociar/pmes/${slug}/banner.jpg` : null,
    logoUrl: fs.existsSync(logoFsPath) ? `/negociar/pmes/${slug}/logo.png` : null,
  };
}
