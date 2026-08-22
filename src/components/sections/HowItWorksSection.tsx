"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/components/motion/Reveal";
import { ptBr } from "@/lib/i18n/pt-br";

const SCROLL_PX_PER_STEP = 600;
// Duração fixa (ms) das animações de flip (globals.css) — precisa bater com
// o "0.5s" do CSS: é o timeout de segurança que garante a limpeza da classe
// mesmo se "animationend" não disparar por algum motivo, e também a janela
// de "trava" (nenhum novo passo é aceito enquanto uma transição toca).
const FLIP_DURATION_MS = 500;

type FlipDirection = "forward" | "backward";

function stepFromProgress(progress: number, totalSteps: number) {
  if (totalSteps <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.min(totalSteps - 1, Math.round(clamped * (totalSteps - 1)));
}

// Sequência "pinned": a seção fica presa na tela enquanto o usuário rola.
// O Lenis continua cuidando do scroll normalmente (não interceptamos wheel/
// touch diretamente — tentar "sequestrar" o input e pausar o Lenis foi o
// que quebrou a versão anterior: o Lenis processa o scroll por conta
// própria, então brigar com ele por fora só deixava os cards travados nos
// resets de entrada/saída, sem nenhuma transição no meio). Em vez disso,
// a cada atualização de scroll (onUpdate) só deixamos o índice avançar OU
// voltar **um** passo por vez, mesmo que o progresso bruto do scroll tenha
// pulado direto pra um card mais distante num scroll rápido — e, enquanto
// o flip de 0.5s ainda está tocando, a posição real do scroll é forçada de
// volta pro degrau atual (lenis.scrollTo) a cada tick, "travando" o scroll
// até a transição terminar. Avançar usa .flip-2-hor-top-1 (sai) +
// .flip-in-hor-bottom-1 (entra); voltar usa o par espelhado
// .flip-2-hor-bottom-1 + .flip-in-hor-top-1 (globals.css), então a direção
// do flip acompanha a direção real da navegação. Sem JS, os cards
// continuam em fluxo vertical normal — o JSX abaixo nunca muda; só
// aplicamos position:absolute/opacity/classes via gsap/DOM direto (estilo
// imperativo), então não há divergência de markup entre servidor e
// cliente.
export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lenis = useLenis();

  useEffect(() => {
    const section = sectionRef.current;
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (!section || cards.length < 2) return;

    gsap.registerPlugin(ScrollTrigger);

    let activeIndex = 0;
    // Índice "autoritativo" de repouso: igual a activeIndex quando parado;
    // durante um flip, é o alvo pra onde já pulamos o scroll (não o de
    // origem) — evita que o próprio ScrollTrigger.onUpdate, disparado pelo
    // nosso lenis.scrollTo abaixo, desfaça o pulo que acabamos de fazer.
    let lockedIndex = 0;
    let isAnimating = false;
    let st: ScrollTrigger | null = null;

    const stepScrollY = (index: number) => (st ? st.start + index * SCROLL_PX_PER_STEP : 0);

    const resetTo = (index: number) => {
      gsap.set(cards, { opacity: 0, zIndex: 0 });
      gsap.set(cards[index], { opacity: 1, zIndex: 1 });
      activeIndex = index;
      lockedIndex = index;
      isAnimating = false;
    };

    const runTransition = (nextIndex: number, direction: FlipDirection) => {
      const outgoing = cards[activeIndex];
      const incoming = cards[nextIndex];
      isAnimating = true;

      const outClass = direction === "forward" ? "flip-2-hor-top-1" : "flip-2-hor-bottom-1";
      const inClass = direction === "forward" ? "flip-in-hor-bottom-1" : "flip-in-hor-top-1";

      // Saindo por cima (z-index maior) enquanto o card seguinte já fica
      // visível por baixo — é o que dá a ilusão de um único card virando e
      // revelando o próximo, não duas trocas independentes.
      gsap.set(outgoing, { zIndex: 2 });
      gsap.set(incoming, { opacity: 1, zIndex: 1 });
      outgoing.classList.add(outClass);
      incoming.classList.add(inClass);

      const finish = () => {
        outgoing.removeEventListener("animationend", finish);
        window.clearTimeout(fallbackTimer);
        outgoing.classList.remove(outClass);
        incoming.classList.remove(inClass);
        gsap.set(outgoing, { opacity: 0, zIndex: 0 });
        gsap.set(incoming, { zIndex: 1 });
        activeIndex = nextIndex;
        isAnimating = false;
      };

      const fallbackTimer = window.setTimeout(finish, FLIP_DURATION_MS);
      outgoing.addEventListener("animationend", finish, { once: true });
    };

    const goToStep = (nextIndex: number, direction: FlipDirection) => {
      lockedIndex = nextIndex;
      runTransition(nextIndex, direction);
      lenis?.scrollTo(stepScrollY(nextIndex), { immediate: true, force: true });
    };

    const ctx = gsap.context(() => {
      gsap.set(cards, { position: "absolute", inset: 0, opacity: 0, zIndex: 0 });
      gsap.set(cards[0], { opacity: 1, zIndex: 1 });

      st = ScrollTrigger.create({
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
        onEnter: () => resetTo(0),
        onEnterBack: () => resetTo(cards.length - 1),
        onUpdate: (self) => {
          if (isAnimating) {
            // Trava: qualquer scroll que tenha acontecido durante o flip é
            // desfeito, mantendo a posição exatamente no degrau-alvo até a
            // transição terminar.
            lenis?.scrollTo(stepScrollY(lockedIndex), { immediate: true, force: true });
            return;
          }

          const rawIndex = stepFromProgress(self.progress, cards.length);
          if (rawIndex === activeIndex) return;

          // Nunca avança/volta mais de um degrau por vez, mesmo que o
          // progresso bruto do scroll tenha pulado direto pra um índice
          // mais distante num scroll rápido.
          const step = rawIndex > activeIndex ? 1 : -1;
          const nextIndex = activeIndex + step;
          goToStep(nextIndex, step > 0 ? "forward" : "backward");
        },
      });
    }, section);

    return () => ctx.revert();
  }, [lenis]);

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
            card saindo assim que ele passa do translateY(±100%), em vez
            de vazar por cima/baixo do resto da seção. */}
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
