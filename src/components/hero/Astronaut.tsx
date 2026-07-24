"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { AstronautRig } from "./astronaut/AstronautRig";
import { AstronautModel } from "./astronaut/AstronautModel";

// Componente cliente isolado do hero — carregado via next/dynamic com
// ssr: false em Hero.tsx, pois WebGL não roda em SSR.
export default function Astronaut() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.1,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.2], fov: 35 }}
        frameloop={inView && !reducedMotion ? "always" : "demand"}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 2]} intensity={1.1} />
        <directionalLight position={[-2, -1, -2]} intensity={0.3} />
        <Environment preset="apartment" />
        <AstronautRig reducedMotion={reducedMotion}>
          <AstronautModel />
        </AstronautRig>
      </Canvas>
    </div>
  );
}
