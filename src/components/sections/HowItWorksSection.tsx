"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/components/motion/Reveal";
import { ptBr } from "@/lib/i18n/pt-br";

const SCROLL_PX_PER_STEP = 600;
// Duração fixa (ms) da animação flip-2-hor-top-1 / flip-in-hor-bottom-1
// (globals.css) — precisa bater com o "0.5s" do CSS: é o timeout de
// segurança que garante a limpeza da classe mesmo se "animationend" não
// disparar por algum motivo.
const FLIP_DURATION_MS = 500;

function stepFromProgress(progress: number, totalSteps: number) {
  if (totalSteps <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.min(totalSteps - 1, Math.round(clamped * (totalSteps - 1)));
}

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sequência "pinned": a seção fica presa na tela enquanto o scroll avança
  // por um trecho longo. Diferente da versão anterior (crossfade contínuo
  // escrubado 1:1 com o scroll), a troca entre cards agora é discreta: o
  // scroll só decide QUANDO trocar de índice, e a transição em si é o flip
  // 3D de duração fixa (.flip-2-hor-top-1 saindo + .flip-in-hor-bottom-1
  // entrando, ambas em globals.css, 0.5s cada, sempre tocadas por completo
  // mesmo que o scroll continue). Sem JS, os cards continuam em fluxo
  // vertical normal — o JSX abaixo nunca muda; só aplicamos
  // position:absolute/opacity/classes via gsap/DOM direto (estilo
  // imperativo), então não há divergência de markup entre servidor e
  // cliente.
  useEffect(() => {
    const section = sectionRef.current;
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (!section || cards.length < 2) return;

    gsap.registerPlugin(ScrollTrigger);

    // Não dá pra "envolver" um disparo de JS num bloco @media — a checagem
    // equivalente a @media (prefers-reduced-motion: reduce) para lógica de
    // script é matchMedia, lida uma vez fora do listener de scroll.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      gsap.set(cards, { position: "absolute", inset: 0, opacity: 0, zIndex: 0 });
      gsap.set(cards[0], { opacity: 1, zIndex: 1 });

      let activeIndex = 0;
      let pendingIndex = 0;
      let isAnimating = false;

      const runTransition = (nextIndex: number) => {
        const outgoing = cards[activeIndex];
        const incoming = cards[nextIndex];
        isAnimating = true;

        if (prefersReducedMotion) {
          // Troca instantânea de opacidade, sem o flip 3D.
          gsap.set(outgoing, { opacity: 0, zIndex: 0 });
          gsap.set(incoming, { opacity: 1, zIndex: 1 });
          activeIndex = nextIndex;
          isAnimating = false;
          if (pendingIndex !== activeIndex) runTransition(pendingIndex);
          return;
        }

        // Saindo por cima (z-index maior) enquanto o card seguinte já fica
        // visível por baixo — é o que dá a ilusão de um único card virando
        // e revelando o próximo, não duas trocas independentes.
        gsap.set(outgoing, { zIndex: 2 });
        gsap.set(incoming, { opacity: 1, zIndex: 1 });
        outgoing.classList.add("flip-2-hor-top-1");
        incoming.classList.add("flip-in-hor-bottom-1");

        const finish = () => {
          outgoing.removeEventListener("animationend", finish);
          window.clearTimeout(fallbackTimer);
          // Remover a classe libera a próxima troca poder disparar a
          // mesma animação de novo (senão o navegador ignora reaplicar
          // uma classe já presente).
          outgoing.classList.remove("flip-2-hor-top-1");
          incoming.classList.remove("flip-in-hor-bottom-1");
          gsap.set(outgoing, { opacity: 0, zIndex: 0 });
          gsap.set(incoming, { zIndex: 1 });
          activeIndex = nextIndex;
          isAnimating = false;
          // Se o scroll já avançou para um índice mais recente enquanto
          // este flip tocava, encadeia a próxima transição imediatamente.
          if (pendingIndex !== activeIndex) runTransition(pendingIndex);
        };

        const fallbackTimer = window.setTimeout(finish, FLIP_DURATION_MS);
        outgoing.addEventListener("animationend", finish, { once: true });
      };

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
        onUpdate: (self) => {
          pendingIndex = stepFromProgress(self.progress, cards.length);
          if (!isAnimating && pendingIndex !== activeIndex) {
            runTransition(pendingIndex);
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="flex min-h-screen flex-col justify-center bg-surface-alt px-6 py-20"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {ptBr.sections.howItWorks.title}
          </h2>
          <p className="mt-3 text-lg text-ink-muted">{ptBr.sections.howItWorks.subtitle}</p>
        </Reveal>

        {/* perspective no container (não no card): é o que faz o rotateX
            do flip parecer 3D em vez de achatado. overflow-hidden corta o
            card saindo assim que ele passa do translateY(-100%) do topo,
            em vez de vazar por cima do título. */}
        <div
          className="relative mx-auto mt-12 grid min-h-[200px] w-full max-w-xl grid-cols-1 gap-6 overflow-hidden"
          style={{ perspective: "1000px" }}
        >
          {ptBr.sections.howItWorks.steps.map((step, index) => (
            <div
              key={step.title}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="flex flex-col gap-3 border border-border bg-surface p-6 shadow-soft-lg"
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
