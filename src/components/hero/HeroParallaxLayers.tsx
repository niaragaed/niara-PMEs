"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Decorative parallax layers (different speeds when scrolling),
// inspired by layer1..4 of MetaMask's hero. Purely visual —
// aria-hidden and without any text content. Includes the ringed-planet
// motif (the same stroke as <Logo />) as a subtle central element,
// in the spot the astronaut used to occupy.
// The hero has a SOLID military background (dark green): the glow and the planet body
// use light tones (bg/salmon) at low opacity — military tones would look
// "dirty" (same color family as the background) and strokes in --color-military
// would disappear entirely on top of military itself. The salmon ring is a deliberate
// exception: high opacity (0.9), so it pops over the green instead of blending
// into it.
export function HeroParallaxLayers() {
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        {/* Planet body: a subtle stroke, with its own opacity (no longer
            diluted together with the ring — see the history in CLAUDE.md). */}
        <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
          <circle cx="100" cy="100" r="72" stroke="var(--color-bg)" strokeWidth="1.5" opacity="0.3" />
          {/* Ring: high opacity so the salmon dominates over the military.
              The static tilt (-18deg) lives in the CSS animation
              (hero-orbit-ring-spin, globals.css), no longer in a loose
              "transform" attribute — a CSS transform fully replaces the
              SVG attribute on the same element, so the two can't
              coexist without conflict. */}
          <g className="hero-orbit-ring">
            <ellipse cx="100" cy="100" rx="98" ry="34" stroke="var(--color-salmon)" strokeWidth="1.5" opacity="0.9" />
          </g>
        </svg>
      </div>
    </div>
  );
}
