import "server-only";
import { NextResponse } from "next/server";
import { getEventosOnChain } from "@/lib/web3/events";

// Endpoint disparado pelo Vercel Cron (ver vercel.json) para manter o cache on-chain de /socios
// sempre em dia, sem depender de alguém visitar a página. Reaproveita a MESMA função incremental
// que a página já usa (getEventosOnChain) — ela já respeita o teto de blocos por execução
// (MAX_BLOCOS_POR_EXECUCAO em events.ts), então mesmo com um backlog grande (ex.: cron fora do ar
// por um tempo) esta rota nunca estoura o timeout: ela só avança o quanto der e, se sobrar,
// a próxima execução do cron continua de onde parou.
export const maxDuration = 60;

function autorizado(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  // Sem CRON_SECRET configurado, recusa por padrão — nunca deixa a rota aberta sem querer.
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const eventos = await getEventosOnChain();
    return NextResponse.json({ ok: true, totalEventosNoCache: eventos.length });
  } catch (error) {
    console.error("[cron/sync-onchain] falha ao sincronizar:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
