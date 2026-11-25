import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Pages that must not be indexed (login, account, internal dashboards, demo
// screens) are marked noindex in their own metadata rather than disallowed here:
// a crawler that is blocked from a page can't see its noindex tag.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
