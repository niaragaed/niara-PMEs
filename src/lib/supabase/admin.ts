import "server-only";

// 🔴 Admin client: uses SUPABASE_SERVICE_ROLE_KEY, which BYPASSES the database's entire
// RLS (Row Level Security). Never import this module in a
// client component nor expose `service_role` to the browser — the
// `import "server-only"` above already breaks the build if that happens.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
