// Background light for the solid sage (bg-military) of the inner screens — /negociar, /ativos,
// /perfil, /investir. Purely decorative (aria-hidden, no pointer-events), to break up the
// "wall of green" with real hue contrast: it uses --color-salmon (the same peach as the
// badges/CTAs), not a variation of the green itself — that was the 1st attempt (see history) and it
// didn't work because it was too subtle to notice from afar. No blur filter — the fading
// comes from the radial-gradient itself (cheaper for the GPU and no leftover visible outline).
//
// TWEAKS:
//   - Color and intensity (what you'll most likely calibrate) are CSS variables in
//     globals.css's :root (--section-glow-color, --section-glow-opacity-primary/-secondary) —
//     change them there, without touching this file.
//   - Each glow's position/size is in the GLOWS array below (Tailwind classes).
//   - To turn the animation off (keep the glows fixed), use <SectionGlow animate={false} />.
//
// Geometry designed for contrast safety: both glows are ANCHORED outside the
// container (large negative offsets) — the gradient's full center is always outside the visible
// area, so what shows on screen is already the gradient's softest edge, never the opacity
// peak. Title/subtitle (text-on-military) typically sit in the corner opposite each
// glow; cards on top are opaque (bg-surface/bg-panel) and fully cover the glow where they
// exist — there's no loose text in the strongest zone of either one.
//
// Doesn't need "use client": it's just static HTML/CSS (the animation is pure CSS via a class — see
// globals.css), with no React state or effect.
//
// 🔴 CALLER REQUIREMENT — the element wrapping <SectionGlow /> needs the
// `isolate` class (never just `relative`, never `relative z-0`). Without it, `-z-10` (see below)
// escapes to the document's stacking context and the caller's own background covers the glow
// completely — no matter the opacity. `position: relative` alone does NOT create a stacking context
// (it needs `isolate`, or `position` + a numeric z-index); `isolate` does the same without requiring
// `position` on the element.
//
// 🔴 SIDE EFFECT OF `isolate` ON THE CALLER + `fixed` on the glow — `isolate` also raises the
// caller (e.g. <main>) to the same paint-priority "floor" as positioned elements,
// above SIBLINGS that aren't stacking contexts (e.g. <Footer>, common in the root layout). Since the
// inner glow is `fixed` (it covers the whole viewport, including on top of where the footer shows up
// when scrolling to the end), this made the glow visibly leak into the <Footer>, tinting its light
// background salmon (seen in a real screenshot). Fixed by giving `isolate` to <Footer> too
// (src/components/nav/Footer.tsx) — both sit on the same "floor", and since <Footer> comes AFTER
// <main> in the document, it now paints on top where the boxes overlap, covering the
// glow with its own opaque background. If some other element between <main> and <Footer> ever needs
// to sit visually on top of the glow near the end of the page, the same reasoning applies: give
// it `isolate` too (never rely only on DOM order without an equivalent stacking context).
//
// 🔴 HISTORY OF POSITIONING ATTEMPTS (all actually verified with Playwright —
// real scroll + getComputedStyle + a screenshot for each one, not just reasoning about CSS, because
// more than one looked right on paper and wasn't):
//
// 1. `absolute inset-0` inside the container: covered the whole DOCUMENT height, not the screen.
//    On a short page it went unnoticed, but on a long grid (e.g. the 10 SMEs) the glow anchored at
//    the bottom sat thousands of pixels below what can be seen — the middle of the scroll went by
//    with no glow anywhere near.
// 2. `fixed inset-0` (used today): solves the problem above (tied to the viewport, not the
//    document) — but on its own it leaked into the <Footer>, see "CALLER REQUIREMENT" above for why
//    and the fix.
// 3. `sticky top-0` with a fixed height + an equal negative `margin-bottom`, trying to make the
//    wrapper "self-confine" to the <main> box without leaking into the Footer: TESTED AND DISCARDED —
//    measuring with Playwright across the whole scroll range (not just start/middle/end), the
//    wrapper never came unstuck from the top, even near the end of the document — cancelling the
//    height via a negative margin doesn't make the browser recompute the release limit the way the
//    logic suggests (tested in a flex-col layout; it may be a quirk of the combination, don't trust it
//    again without measuring). Practical result: it behaved like `fixed`, just without the advantage
//    of being simpler.
type GlowSpec = {
  position: string;
  opacityVar: "--section-glow-opacity-primary" | "--section-glow-opacity-secondary";
  animationClass: "animate-section-glow-a" | "animate-section-glow-b";
};

const GLOWS: GlowSpec[] = [
  {
    position: "-top-40 -right-40 h-[48rem] w-[48rem]",
    opacityVar: "--section-glow-opacity-primary",
    animationClass: "animate-section-glow-a",
  },
  {
    position: "-bottom-56 -left-40 h-[36rem] w-[36rem]",
    opacityVar: "--section-glow-opacity-secondary",
    animationClass: "animate-section-glow-b",
  },
];

export function SectionGlow({ animate = true }: { animate?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {GLOWS.map((glow, index) => (
        <div
          key={index}
          className={`absolute rounded-full ${glow.position} ${animate ? glow.animationClass : ""}`}
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, var(--section-glow-color) var(${glow.opacityVar}), transparent) 0%, transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}
