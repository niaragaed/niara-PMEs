import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ aviso?: "apenas-empresa" | "apenas-investidor"; onboarding?: string }>;
};

// /conta virou um redirect fino para /perfil (que hoje concentra os dados de
// conta/cadastro reais). Mantido como rota — evita link morto caso algo
// ainda aponte para /conta — só repassa o aviso ?aviso= e o ?onboarding=.
export default async function ContaPage({ searchParams }: PageProps) {
  const { aviso, onboarding } = await searchParams;
  const params = new URLSearchParams();
  if (aviso) params.set("aviso", aviso);
  if (onboarding) params.set("onboarding", onboarding);
  const query = params.toString();
  redirect(query ? `/perfil?${query}` : "/perfil");
}
