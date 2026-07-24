import Image from "next/image";
import Link from "next/link";

// Placeholder até a arte final (PNG preto sobre fundo transparente) ser
// adicionada em public/. Quando o arquivo definitivo chegar, basta trocar
// este caminho — nenhum outro componente referencia o logo diretamente.
const LOGO_SRC = "/niara-pme-logo.svg";

export function Logo() {
  return (
    <Link href="/" className="flex items-center" aria-label="Niara PMEs — página inicial">
      <Image src={LOGO_SRC} alt="Niara PMEs" width={168} height={28} priority className="h-6 w-auto sm:h-7" />
    </Link>
  );
}
