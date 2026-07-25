import Link from "next/link";
import { ptBr } from "@/lib/i18n/pt-br";

export default function NotFound() {
  const t = ptBr.negociar.oferta.naoEncontrada;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-military px-6 py-32 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.title}</h1>
      <p className="max-w-md text-on-military-muted">{t.description}</p>
      <Link href="/negociar/ativos-e-tokens" className="text-sm font-medium text-salmon hover:text-salmon-600">
        {t.voltar}
      </Link>
    </main>
  );
}
