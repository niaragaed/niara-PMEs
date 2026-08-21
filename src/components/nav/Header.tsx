import { HeaderClient } from "./HeaderClient";
import { loadHeaderAccount } from "@/lib/nav/headerAccount";

// Server Component fino — só resolve a sessão (cookies, via
// loadHeaderAccount) e repassa como prop. Toda a interação (scroll, menu
// mobile, dropdown de conta) mora em HeaderClient.tsx, que precisa ser
// client component; este arquivo não pode ser "use client" porque ler
// sessão/Storage exige rodar no servidor.
export async function Header() {
  const account = await loadHeaderAccount();
  return <HeaderClient account={account} />;
}
