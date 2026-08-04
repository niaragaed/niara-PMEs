// Proxy (Next.js 16 — renomeado de "middleware") com o padrão oficial do
// @supabase/ssr: refresca o token de auth a cada navegação para que Server
// Components/rotas protegidas enxerguem a sessão atual via cookie. Não
// conter lógica de negócio aqui — só o refresh de sessão.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Não inserir lógica entre createServerClient e getUser(): getUser()
  // revalida o token direto no servidor do Supabase (ao contrário de
  // getSession(), que só lê o cookie) — é o que de fato refresca a sessão.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
