"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useSpring } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ASTRONAUT_ANCHORS,
  ASTRONAUT_DESKTOP_MEDIA_QUERY,
  ASTRONAUT_MOBILE_HERO_ANCHOR,
  ASTRONAUT_MOBILE_MEDIA_QUERY,
  type AstronautAnchor,
} from "./anchors";

// Placeholder até a arte final chegar recortada em public/astronaut.png —
// ver CLAUDE.md. O componente não quebra caso o arquivo ainda não exista
// (next/image só exibe um espaço vazio/erro 404 na imagem, sem crashar).
const ASTRONAUT_SRC = "/astronaut.png";

const MAX_TILT_DEG = 9;
const MAX_PARALLAX_PX = 10;

function anchorVars(anchor: AstronautAnchor) {
  return {
    left: anchor.left,
    top: anchor.top,
    xPercent: anchor.xPercent,
    yPercent: anchor.yPercent,
    scale: anchor.scale,
    opacity: anchor.opacity,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPercent(a: string, b: string, t: number) {
  return `${lerp(parseFloat(a), parseFloat(b), t)}%`;
}

// Interpola entre duas âncoras consecutivas dado um progresso local (0..1).
function poseAt(from: AstronautAnchor, to: AstronautAnchor, t: number) {
  return {
    left: lerpPercent(from.left, to.left, t),
    top: lerpPercent(from.top, to.top, t),
    xPercent: lerp(from.xPercent, to.xPercent, t),
    yPercent: lerp(from.yPercent, to.yPercent, t),
    scale: lerp(from.scale, to.scale, t),
    opacity: lerp(from.opacity, to.opacity, t),
  };
}

export function AstronautGuide() {
  const positionRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const rotateX = useSpring(0, { stiffness: 120, damping: 20, mass: 0.6 });
  const rotateY = useSpring(0, { stiffness: 120, damping: 20, mass: 0.6 });
  const parallaxX = useSpring(0, { stiffness: 100, damping: 22, mass: 0.6 });

  // Detecta prefers-reduced-motion e mantém sincronizado com mudanças do SO.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Inclinação sutil seguindo o cursor (com amortecimento via spring do
  // framer-motion — nunca movimento seco). Eixo vertical: cursor ACIMA do
  // centro da tela deve inclinar o astronauta para "olhar para cima"
  // (rotateX positivo inclina o topo da imagem para trás/longe da câmera).
  useEffect(() => {
    if (reducedMotion) return;

    function onPointerMove(event: PointerEvent) {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      rotateY.set(nx * MAX_TILT_DEG);
      rotateX.set(-ny * MAX_TILT_DEG);
      parallaxX.set(nx * MAX_PARALLAX_PX);
    }

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [reducedMotion, rotateX, rotateY, parallaxX]);

  // Viagem pelo scroll: uma âncora de pose por seção principal, com
  // transições scrub-adas pelo GSAP ScrollTrigger entre cada par.
  useEffect(() => {
    const node = positionRef.current;
    if (!node) return;

    if (reducedMotion) {
      // Sem viagem animada: fica estático na pose do hero, mas só enquanto
      // o hero estiver visível — sem isso, por ser `position: fixed`, ele
      // continuaria sobrepondo o conteúdo das seções seguintes ao rolar.
      // É uma troca de presença instantânea (sem transição), não uma
      // animação, então continua respeitando prefers-reduced-motion.
      gsap.set(node, anchorVars(ASTRONAUT_ANCHORS[0]));

      const heroEl = document.getElementById(ASTRONAUT_ANCHORS[0].id);
      if (!heroEl) return;

      const observer = new IntersectionObserver(
        ([entry]) => gsap.set(node, { opacity: entry.isIntersecting ? 1 : 0 }),
        { threshold: 0 },
      );
      observer.observe(heroEl);
      return () => observer.disconnect();
    }

    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add(
      { isDesktop: ASTRONAUT_DESKTOP_MEDIA_QUERY, isMobile: ASTRONAUT_MOBILE_MEDIA_QUERY },
      (context) => {
        const { isDesktop } = context.conditions as { isDesktop: boolean };

        if (isDesktop) {
          const anchors = ASTRONAUT_ANCHORS.map((anchor) => ({
            anchor,
            el: document.getElementById(anchor.id),
          })).filter((entry): entry is { anchor: AstronautAnchor; el: HTMLElement } => entry.el !== null);

          if (anchors.length < 2) return;

          const segments = anchors.length - 1;

          // Um único ScrollTrigger cobrindo toda a jornada; a cada
          // atualização calculamos manualmente em qual segmento (par de
          // âncoras consecutivas) o progresso cai e interpolamos a pose.
          // Evita usar uma gsap.timeline com vários .fromTo() encadeados no
          // mesmo elemento: cada .fromTo() faz um render imediato do seu
          // "from" ao ser criado, e esses renders se sobrescrevem antes do
          // primeiro scroll, deixando a pose inicial errada.
          function render(progress: number) {
            const scaled = Math.min(Math.max(progress, 0), 1) * segments;
            const index = Math.min(Math.floor(scaled), segments - 1);
            const localT = scaled - index;
            gsap.set(node, poseAt(anchors[index].anchor, anchors[index + 1].anchor, localT));
          }

          render(0);

          const trigger = ScrollTrigger.create({
            trigger: anchors[0].el,
            start: "top top",
            endTrigger: anchors[anchors.length - 1].el,
            end: "top center",
            scrub: 1,
            onUpdate: (self) => render(self.progress),
          });

          return () => {
            trigger.kill();
          };
        }

        // Mobile/tablet: só aparece no hero, e some ao rolar para além dele.
        const heroEl = document.getElementById(ASTRONAUT_MOBILE_HERO_ANCHOR.id);
        if (!heroEl) return;

        gsap.set(node, anchorVars(ASTRONAUT_MOBILE_HERO_ANCHOR));

        const tween = gsap.to(node, {
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: heroEl,
            start: "bottom 80%",
            end: "bottom 20%",
            scrub: 1,
          },
        });

        return () => {
          tween.scrollTrigger?.kill();
        };
      },
    );

    return () => mm.revert();
  }, [reducedMotion]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30" aria-hidden="true">
      <div
        ref={positionRef}
        className="absolute w-[220px]"
        style={{ willChange: "transform" }}
      >
        <motion.div style={{ rotateX, rotateY, x: parallaxX, transformPerspective: 800 }}>
          <Image
            src={ASTRONAUT_SRC}
            alt=""
            width={698}
            height={357}
            priority
            className="h-auto w-full max-w-none select-none"
            draggable={false}
          />
        </motion.div>
      </div>
    </div>
  );
}
