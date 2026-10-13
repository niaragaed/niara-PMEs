"use client";

import Image from "next/image";
import Link from "next/link";
import { useDictionary } from "@/lib/i18n/client";

// Final artwork (globe + ring + "NIARA", black on a transparent background).
// Real intrinsic dimensions (996x606) — the displayed height is limited via
// className, the width follows automatically keeping the aspect ratio.
const LOGO_SRC = "/niara-pme-logo.png";

export function Logo() {
  const dict = useDictionary();
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={dict.common.homeAriaLabel}>
      <Image src={LOGO_SRC} alt="Niara" width={996} height={606} priority className="h-7 w-auto sm:h-9" />
      {/* The artwork only has "NIARA" — the "PMEs" descriptor remains separate
          text to tell it apart from the exchange product (niara-site). */}
      <span className="font-display text-sm font-medium text-ink-muted sm:text-base">· PMEs</span>
    </Link>
  );
}
