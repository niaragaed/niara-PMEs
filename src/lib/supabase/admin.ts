import "server-only";

// 🔴 Client admin: usa SUPABASE_SERVICE_ROLE_KEY, que BYPASSA o RLS
// (Row Level Security) inteiro do banco. Nunca importar este módulo em um
// componente client nem expor `service_role` ao navegador — o
// `import "server-only"` acima já quebra o build se isso acontecer.
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
