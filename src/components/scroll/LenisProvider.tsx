"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Dirige o ticker do GSAP a partir do raf do Lenis e mantém o ScrollTrigger
// sincronizado com o scroll suave — sem isso, pin/scrub ficam dessincronizados
// do Lenis (que intercepta o scroll nativo).
function GsapScrollSync() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    const instance = lenis;

    function onScroll() {
      ScrollTrigger.update();
    }
    instance.on("scroll", onScroll);

    function onTick(time: number) {
      instance.raf(time * 1000);
    }
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    // Seções com pin (ex.: "Como funciona") inserem um pin-spacer que
    // aumenta a altura do documento. Sempre que o ScrollTrigger recalcular,
    // avisa o Lenis para remedir (senão o Lenis trava o scroll antes do fim
    // real da página).
    function onRefresh() {
      instance.resize();
    }
    ScrollTrigger.addEventListener("refresh", onRefresh);

    ScrollTrigger.refresh();

    return () => {
      instance.off("scroll", onScroll);
      gsap.ticker.remove(onTick);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
    };
  }, [lenis]);

  return null;
}

export function LenisProvider({ children }: { children: ReactNode }) {
  // Decisão deliberada do usuário: as animações do site sempre tocam,
  // mesmo com prefers-reduced-motion ativo no SO/navegador — não
  // desligamos mais o Lenis/GSAP nesse caso (ver CLAUDE.md).
  //
  // 🔴 Lenis (scroll suave) + a sincronização com ScrollTrigger só existem
  // por causa da sequência pinned "Como funciona" e do parallax do Hero —
  // as duas únicas coisas do site que usam ScrollTrigger/useLenis, e as
  // duas só existem na Home. Em todas as outras rotas, montar Lenis só
  // trocava scroll nativo (que sempre funciona) por scroll interceptado,
  // sem nenhum benefício — e foi a causa de um bug real reportado pelo
  // usuário: rolagem via roda do mouse parava antes do fim em telas como
  // /negociar e /ativos (o teclado/scrollbar continuavam funcionando até
  // o fim, porque não passam pelo listener de wheel do Lenis). Causa
  // raiz: Lenis mede o teto de scroll (`limit`) uma vez ao montar; nessas
  // telas o conteúdo real (leituras on-chain das ofertas, imagens) chega
  // depois, então a página cresce mas o teto do Lenis não acompanha —
  // scroll por wheel trava no teto antigo, mais curto que o conteúdo
  // real. Na Home isso nunca aparecia porque o conteúdo é estático,
  // renderizado por completo antes do Lenis montar. Restringir o
  // provider à Home elimina a classe inteira de bug nas demais rotas sem
  // tocar na animação da Home.
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (!isHome) return <>{children}</>;

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, duration: 1.2 }}>
      <GsapScrollSync />
      {children}
    </ReactLenis>
  );
}
