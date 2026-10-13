import "server-only";

// Supabase client for use in Server Components/Actions. Uses the
// public key (anon/publishable) and the request's cookie to keep the user's
// session — respects RLS, unlike the admin client (service_role).
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
            // Called from a Server Component — cookies can't be
            // written here. Safe to ignore when there's a
            // middleware (or Server Action) responsible for refreshing the
            // user's session.
          }
        },
      },
    },
  );
}
