import "server-only";

// Client Supabase para uso em Server Components/Actions. Usa a chave
// pública (anon/publishable) e o cookie da requisição para manter a sessão
// do usuário — respeita RLS, diferente do client admin (service_role).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Chamado a partir de um Server Component — não é possível
            // escrever cookies aqui. Seguro ignorar quando há um
            // middleware (ou Server Action) responsável por refrescar a
            // sessão do usuário.
          }
        },
      },
    },
  );
}
