import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ aviso?: "apenas-empresa" | "apenas-investidor" }>;
};

// /conta virou um redirect fino para /perfil (que hoje concentra os dados de
// conta/cadastro reais). Mantido como rota — evita link morto caso algo
// ainda aponte para /conta — só repassa o aviso ?aviso=.
export default async function ContaPage({ searchParams }: PageProps) {
  const { aviso } = await searchParams;
  redirect(aviso ? `/perfil?aviso=${aviso}` : "/perfil");
}
