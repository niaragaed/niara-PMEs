"use client";

import { useEffect, type ReactNode } from "react";
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
  // Decisão deliberada do usuário: as animações do site sempre tocam,
  // mesmo com prefers-reduced-motion ativo no SO/navegador — não
  // desligamos mais o Lenis/GSAP nesse caso (ver CLAUDE.md).
  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, duration: 1.2 }}>
      <GsapScrollSync />
      {children}
    </ReactLenis>
  );
}
