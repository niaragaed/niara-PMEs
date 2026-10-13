"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_MAX_AGE, LOCALE_COOKIE, parseLocale } from "@/lib/i18n/locale";

/**
 * Stores the chosen language and makes the whole layout render again, so the header and the page
 * switch together. Takes FormData because the switcher is a <form> with two submit buttons, which
 * also works without JS. The route doesn't change: the action answers on the same URL.
 */
export async function switchLocale(formData: FormData) {
  const chosen = parseLocale(formData.get("locale")?.toString());
  if (!chosen) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, chosen, { path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax" });

  revalidatePath("/", "layout");
}
