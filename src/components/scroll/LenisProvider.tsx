"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Drives the GSAP ticker from Lenis's raf and keeps ScrollTrigger
// in sync with the smooth scroll — without this, pin/scrub get out of sync
// with Lenis (which intercepts the native scroll).
function GsapScrollSync() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    const instance = lenis;

    function onScroll() {
      ScrollTrigger.update();
    }
    instance.on("scroll", onScroll);

    function onTick(time: number) {
      instance.raf(time * 1000);
    }
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    // Pinned sections (e.g. "How it works") insert a pin-spacer that
    // increases the document height. Whenever ScrollTrigger recomputes,
    // tells Lenis to re-measure (otherwise Lenis stops the scroll before the
    // page's real end).
    function onRefresh() {
      instance.resize();
    }
    ScrollTrigger.addEventListener("refresh", onRefresh);

    ScrollTrigger.refresh();

    return () => {
      instance.off("scroll", onScroll);
      gsap.ticker.remove(onTick);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
    };
  }, [lenis]);

  return null;
}

export function LenisProvider({ children }: { children: ReactNode }) {
  // A deliberate user decision: the site's animations always play,
  // even with prefers-reduced-motion enabled in the OS/browser — we
  // no longer turn Lenis/GSAP off in that case (see CLAUDE.md).
  //
  // 🔴 Lenis (smooth scroll) + the ScrollTrigger sync only exist
  // because of the pinned "How it works" sequence and the Hero parallax —
  // the only two things on the site that use ScrollTrigger/useLenis, and
  // both exist only on the Home page. On every other route, mounting Lenis only
  // swapped native scroll (which always works) for intercepted scroll,
  // with no benefit at all — and it was the cause of a real bug reported by the
  // user: mouse-wheel scrolling stopped before the end on screens like
  // /negociar and /ativos (keyboard/scrollbar kept working to
  // the end, because they don't go through Lenis's wheel listener). Root
  // cause: Lenis measures the scroll ceiling (`limit`) once on mount; on those
  // screens the real content (on-chain reads of the offerings, images) arrives
  // later, so the page grows but Lenis's ceiling doesn't follow —
  // wheel scrolling gets stuck at the old ceiling, shorter than the real
  // content. On the Home page this never showed up because the content is static,
  // fully rendered before Lenis mounts. Restricting the
  // provider to the Home page eliminates the whole class of bug on the other routes without
  // touching the Home animation.
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (!isHome) return <>{children}</>;

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, duration: 1.2 }}>
      <GsapScrollSync />
      {children}
    </ReactLenis>
  );
}
