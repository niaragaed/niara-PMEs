"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/components/motion/Reveal";
import { ptBr } from "@/lib/i18n/pt-br";

const SCROLL_PX_PER_STEP = 600;

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sequência "pinned": a seção fica presa na tela enquanto o scroll avança
  // por um trecho longo, e cada card ocupa o palco por vez (crossfade). Sem
  // JS ou com prefers-reduced-motion, os cards continuam em grid normal —
  // o JSX abaixo nunca muda; só aplicamos position:absolute/opacity via
  // gsap.set (estilo inline imperativo), então não há divergência de
  // markup entre servidor e cliente.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = sectionRef.current;
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (!section || cards.length < 2) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.set(cards, { position: "absolute", inset: 0 });
      gsap.set(cards.slice(1), { opacity: 0 });
      gsap.set(cards[0], { opacity: 1 });

      const timeline = gsap.timeline();
      for (let i = 0; i < cards.length - 1; i++) {
        timeline.to(cards[i], { opacity: 0, ease: "none" }, i);
        timeline.to(cards[i + 1], { opacity: 1, ease: "none" }, i);
      }

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${(cards.length - 1) * SCROLL_PX_PER_STEP}`,
        pin: true,
        // O <main> da home é `flex flex-col` — por padrão, o GSAP desativa
        // o pinSpacing quando o pai do elemento pinado é display:flex (a
        // suposição é que flex já cuida do espaçamento), o que faz o pin
        // soltar cedo demais aqui. Forçar true reserva o espaço extra de
        // scroll corretamente.
        pinSpacing: true,
        scrub: 1,
        animation: timeline,
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" ref={sectionRef} className="bg-surface-alt px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {ptBr.sections.howItWorks.title}
          </h2>
          <p className="mt-3 text-lg text-ink-muted">{ptBr.sections.howItWorks.subtitle}</p>
        </Reveal>

        <div className="relative mt-12 grid min-h-[420px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ptBr.sections.howItWorks.steps.map((step, index) => (
            <div
              key={step.title}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-8 shadow-soft-lg"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-military-100 text-sm font-semibold text-military">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
              <p className="text-sm text-ink-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
