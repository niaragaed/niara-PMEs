"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Camadas decorativas em parallax (velocidades diferentes ao rolar),
// inspiradas nas layer1..4 do hero da MetaMask. Puramente visual —
// aria-hidden e sem qualquer conteúdo textual.
export function HeroParallaxLayers() {
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const hero = document.getElementById("hero");
    if (!hero) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const layers = [
        { el: layer1Ref.current, speed: 50 },
        { el: layer2Ref.current, speed: -70 },
        { el: layer3Ref.current, speed: 100 },
      ];

      for (const { el, speed } of layers) {
        if (!el) continue;
        gsap.to(el, {
          y: speed,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });
      }
    }, hero);

    return () => ctx.revert();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div ref={layer1Ref} className="absolute -left-16 top-16 h-64 w-64 rounded-full bg-military-100/60 blur-2xl" />
      <div ref={layer2Ref} className="absolute -right-10 top-40 h-72 w-72 rounded-full bg-salmon-100/70 blur-2xl" />
      <div ref={layer3Ref} className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-military-100/40 blur-3xl" />
    </div>
  );
}
