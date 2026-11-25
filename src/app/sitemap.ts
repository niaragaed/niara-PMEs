import type { MetadataRoute } from "next";
import { CATEGORY_META } from "@/lib/categories";
import { absoluteUrl } from "@/lib/site";

// Public, indexable routes only. Deliberately left out:
// - /ativos (its portfolio is entirely demo data),
// - /negociar/oferta/<slug> (fictitious company pages; still canonical, just not promoted),
// - everything that needs a login or is marked noindex (/perfil, /empresa, /investir, /socios, ...).
const PUBLIC_PATHS = [
  "/",
  "/negociar/ativos-e-tokens",
  ...Object.values(CATEGORY_META).map((meta) => meta.href),
  "/sobre/documentos",
  "/sobre/contato",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({ url: absoluteUrl(path) }));
}
