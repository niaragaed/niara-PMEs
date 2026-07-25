import { Mail } from "lucide-react";
import { ContatoForm } from "./ContatoForm";
import { ptBr } from "@/lib/i18n/pt-br";

const CONTACT_EMAIL = "niaragaed@gmail.com";

export function ContatoPage() {
  const t = ptBr.contato;

  return (
    <main className="flex flex-1 flex-col bg-military px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military sm:text-4xl">
          {t.title}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-on-military-muted sm:text-base">{t.subtitle}</p>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <ContatoForm />

          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-panel-border bg-panel p-6">
              <h2 className="text-sm font-semibold text-on-military">{t.direto.title}</h2>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-2 inline-flex items-center gap-2 text-sm text-salmon transition-colors hover:underline"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
