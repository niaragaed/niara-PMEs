// Client Supabase para uso no navegador (Client Components). Usa a chave
// pública (anon/publishable) — segura para expor ao cliente, respeita RLS.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
