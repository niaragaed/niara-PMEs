import "server-only";
import fs from "node:fs";
import path from "node:path";

export type OfferingAssetPaths = {
  bannerUrl: string | null;
  logoUrl: string | null;
};

// Only called from Server Components (page.tsx / CategoryPage.tsx / HubPage.tsx) — fs.existsSync
// doesn't run in "use client". Path convention: public/negociar/pmes/<slug>/banner.jpg (a photo,
// ~3:1 recommended) and logo.png (a round badge, with transparency — the round crop is done
// via CSS, it doesn't need to come ready in the file). Dropping the real files (generated with
// Gemini) into these folders is enough to swap the placeholder for the real image — no code
// change, just a new commit/deploy (public/ is bundled in the build, it isn't read at runtime).
export function getOfferingAssetPaths(slug: string): OfferingAssetPaths {
  const dir = path.join(process.cwd(), "public", "negociar", "pmes", slug);
  const bannerFsPath = path.join(dir, "banner.jpg");
  const logoFsPath = path.join(dir, "logo.png");

  return {
    bannerUrl: fs.existsSync(bannerFsPath) ? `/negociar/pmes/${slug}/banner.jpg` : null,
    logoUrl: fs.existsSync(logoFsPath) ? `/negociar/pmes/${slug}/logo.png` : null,
  };
}
