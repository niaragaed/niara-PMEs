import { HeaderClient } from "./HeaderClient";
import { loadHeaderAccount } from "@/lib/nav/headerAccount";

// A thin Server Component — it only resolves the session (cookies, via
// loadHeaderAccount) and passes it on as a prop. All the interaction (scroll, mobile
// menu, account dropdown) lives in HeaderClient.tsx, which has to be a
// client component; this file can't be "use client" because reading the
// session/Storage has to run on the server.
export async function Header() {
  const account = await loadHeaderAccount();
  return <HeaderClient account={account} />;
}
