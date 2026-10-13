import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ aviso?: "apenas-empresa" | "apenas-investidor"; onboarding?: string }>;
};

// /conta became a thin redirect to /perfil (which now holds the real
// account/registration data). Kept as a route — avoids a dead link in case
// something still points to /conta — it only passes on ?aviso= and ?onboarding=.
export default async function AccountPage({ searchParams }: PageProps) {
  const { aviso: notice, onboarding } = await searchParams;
  const params = new URLSearchParams();
  if (notice) params.set("aviso", notice);
  if (onboarding) params.set("onboarding", onboarding);
  const query = params.toString();
  redirect(query ? `/perfil?${query}` : "/perfil");
}
