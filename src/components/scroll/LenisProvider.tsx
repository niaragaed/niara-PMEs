"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Dirige o ticker do GSAP a partir do raf do Lenis e mantém o ScrollTrigger
// sincronizado com o scroll suave — sem isso, pin/scrub ficam dessincronizados
// do Lenis (que intercepta o scroll nativo).
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

    // Seções com pin (ex.: "Como funciona") inserem um pin-spacer que
    // aumenta a altura do documento. Sempre que o ScrollTrigger recalcular,
    // avisa o Lenis para remedir (senão o Lenis trava o scroll antes do fim
    // real da página).
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
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Com prefers-reduced-motion, não habilita o Lenis — o scroll nativo do
  // navegador (sem inércia) é usado, e teclado/âncoras funcionam sem
  // nenhuma interceptação de JS.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  if (reducedMotion) return children;

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, duration: 1.2 }}>
      <GsapScrollSync />
      {children}
    </ReactLenis>
  );
}
