"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/components/motion/Reveal";
import { useDictionary } from "@/lib/i18n/client";

const SCROLL_PX_PER_STEP = 600;
// Fixed duration (ms) of the flip animations (globals.css) — must match
// the CSS "0.5s": it's the safety timeout that guarantees the class is cleaned up
// even if "animationend" doesn't fire for some reason, and also the
// "lock" window (no new step is accepted while a transition plays).
const FLIP_DURATION_MS = 500;

type FlipDirection = "forward" | "backward";

function stepFromProgress(progress: number, totalSteps: number) {
  if (totalSteps <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.min(totalSteps - 1, Math.round(clamped * (totalSteps - 1)));
}

// "Pinned" sequence: the section stays stuck on screen while the user scrolls.
// Lenis keeps handling the scroll normally (we don't intercept wheel/
// touch directly — trying to "hijack" the input and pause Lenis was
// what broke the previous version: Lenis processes the scroll on its
// own, so fighting it from the outside only left the cards stuck at the
// enter/leave resets, with no transition in between). Instead,
// on each scroll update (onUpdate) we only let the index move forward OR
// back **one** step at a time, even if the raw scroll progress jumped
// straight to a farther card on a fast scroll — and, while
// the 0.5s flip is still playing, the real scroll position is forced
// back to the current step (lenis.scrollTo) on every tick, "locking" the scroll
// until the transition ends. Moving forward uses .flip-2-hor-top-1 (out) +
// .flip-in-hor-bottom-1 (in); moving back uses the mirrored pair
// .flip-2-hor-bottom-1 + .flip-in-hor-top-1 (globals.css), so the flip's
// direction follows the real navigation direction. Without JS, the cards
// stay in normal vertical flow — the JSX below never changes; we only
// apply position:absolute/opacity/classes via gsap/direct DOM (imperative
// style), so there's no markup divergence between server and
// client.
export function HowItWorksSection() {
  const dict = useDictionary();
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lenis = useLenis();

  useEffect(() => {
    const section = sectionRef.current;
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (!section || cards.length < 2) return;

    gsap.registerPlugin(ScrollTrigger);

    let activeIndex = 0;
    // "Authoritative" resting index: equal to activeIndex when idle;
    // during a flip, it's the target we already jumped the scroll to (not the
    // origin) — keeps ScrollTrigger.onUpdate itself, fired by
    // our lenis.scrollTo below, from undoing the jump we just made.
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

      // Leaving on top (higher z-index) while the next card is already
      // visible underneath — that's what creates the illusion of a single card flipping and
      // revealing the next one, not two independent swaps.
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
        // The home's <main> is `flex flex-col` — by default, GSAP turns off
        // pinSpacing when the pinned element's parent is display:flex (the
        // assumption is that flex already handles the spacing), which makes the pin
        // release too early here. Forcing true reserves the extra scroll
        // space correctly.
        pinSpacing: true,
        onEnter: () => resetTo(0),
        onEnterBack: () => resetTo(cards.length - 1),
        onUpdate: (self) => {
          if (isAnimating) {
            // Lock: any scroll that happened during the flip is
            // undone, keeping the position exactly on the target step until the
            // transition ends.
            lenis?.scrollTo(stepScrollY(lockedIndex), { immediate: true, force: true });
            return;
          }

          const rawIndex = stepFromProgress(self.progress, cards.length);
          if (rawIndex === activeIndex) return;

          // Never moves forward/back more than one step at a time, even if the
          // raw scroll progress jumped straight to a farther index
          // on a fast scroll.
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
            {dict.sections.howItWorks.title}
          </h2>
          <p className="mt-3 text-lg text-ink-muted">{dict.sections.howItWorks.subtitle}</p>
        </Reveal>

        {/* perspective on the container (not on the card): it's what makes the flip's
            rotateX look 3D instead of flattened. overflow-hidden clips the
            leaving card as soon as it goes past translateY(±100%), instead
            of spilling over/under the rest of the section. */}
        <div
          className="relative mx-auto mt-12 grid min-h-[200px] w-full max-w-xl grid-cols-1 gap-6 overflow-hidden"
          style={{ perspective: "1000px" }}
        >
          {dict.sections.howItWorks.steps.map((step, index) => (
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
