import Image from "next/image";
import Link from "next/link";

// Arte final (globo + anel + "NIARA", preto sobre fundo transparente).
// Dimensões intrínsecas reais (996x606) — a altura exibida é limitada via
// className, a largura acompanha automaticamente mantendo a proporção.
const LOGO_SRC = "/niara-pme-logo.png";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Niara PMEs — página inicial">
      <Image src={LOGO_SRC} alt="Niara" width={996} height={606} priority className="h-7 w-auto sm:h-9" />
      {/* A arte só traz "NIARA" — o descritor "PMEs" continua como texto
          separado para diferenciar do produto da exchange (niara-site). */}
      <span className="font-display text-sm font-medium text-ink-muted sm:text-base">· PMEs</span>
    </Link>
  );
}
