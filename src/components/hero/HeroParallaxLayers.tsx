"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Camadas decorativas em parallax (velocidades diferentes ao rolar),
// inspiradas nas layer1..4 do hero da MetaMask. Puramente visual —
// aria-hidden e sem qualquer conteúdo textual. Inclui o motivo do
// planeta anelado (mesmo traço do <Logo />) como elemento central sutil,
// no lugar que era ocupado pelo astronauta.
// Hero tem fundo military CHEIO (verde escuro): glow e corpo do planeta
// usam tons claros (bg/salmon) em baixa opacidade — tons military ficariam
// "sujos" (mesma família de cor do fundo) e traços em --color-military
// desapareceriam de vez sobre o próprio military. O anel salmão é exceção
// proposital: opacidade alta (0.9), para saltar sobre o verde em vez de se
// misturar a ele.
export function HeroParallaxLayers() {
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);

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

      if (orbitRef.current) {
        gsap.to(orbitRef.current, {
          y: 30,
          rotate: 8,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });
      }
    }, hero);

    return () => ctx.revert();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div ref={layer1Ref} className="absolute -left-16 top-16 h-64 w-64 rounded-full bg-bg/10 blur-2xl" />
      <div ref={layer2Ref} className="absolute -right-10 top-40 h-80 w-80 rounded-full bg-salmon/35 blur-2xl" />
      <div ref={layer3Ref} className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-bg/10 blur-3xl" />

      <div
        ref={orbitRef}
        className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 sm:h-[560px] sm:w-[560px]"
      >
        {/* Corpo do planeta: traço sutil, opacidade própria (não mais
            diluído junto com o anel — ver histórico no CLAUDE.md). */}
        <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
          <circle cx="100" cy="100" r="72" stroke="var(--color-bg)" strokeWidth="1.5" opacity="0.3" />
          {/* Anel: opacidade alta para o salmão dominar sobre o military.
              A inclinação estática (-18deg) vive na animação CSS
              (hero-orbit-ring-spin, globals.css), não mais num atributo
              "transform" solto — CSS transform substitui por completo o
              atributo SVG no mesmo elemento, então os dois não podem
              coexistir sem conflito. */}
          <g className="hero-orbit-ring">
            <ellipse cx="100" cy="100" rx="98" ry="34" stroke="var(--color-salmon)" strokeWidth="1.5" opacity="0.9" />
          </g>
        </svg>
      </div>
    </div>
  );
}
