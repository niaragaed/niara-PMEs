// Preenche o cache incremental de eventos on-chain (onchain_events_cache/onchain_sync_state,
// ver supabase/migrations/0012_onchain_events_cache.sql e src/lib/web3/events.ts) de uma vez só,
// escaneando desde o bloco de deploy — a leitura "cara" que antes acontecia na primeira visita a
// /socios depois de qualquer redeploy, e que sozinha já estourava o timeout de 60s da função
// serverless da Vercel. Rodar este script localmente (sem esse teto) evita que esse custo caia
// em cima de uma requisição HTTP de verdade. Chamadas seguintes de getEventosOnChain() só
// escaneiam o que for novo desde o último bloco salvo aqui.
//
// Não reaproveita src/lib/web3/events.ts nem src/lib/supabase/admin.ts diretamente — os dois
// importam "server-only", que sob Node puro (fora do bundler do Next, como aqui via tsx) lança
// incondicionalmente (mesmo gotcha já documentado em scripts/seed-demo.ts). Em vez disso, usa
// src/lib/web3/eventsCore.ts (núcleo puro, sem "server-only", extraído justamente para ser
// reaproveitado por este script) e monta o client admin do Supabase manualmente, como
// seed-demo.ts já faz.
//
// Uso: npm run backfill:onchain (lê .env.local; precisa de NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_MOCKBRL_ADDRESS e NEXT_PUBLIC_OFERTAS_ONCHAIN
// apontando pro projeto/contratos certos — os mesmos já usados pelo app).

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import {
  encontrarBlocoDeploy,
  publicClient,
  fetchEventosOnChainRange,
  type EventoOnChain,
} from "@/lib/web3/eventsCore";

function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function eventoParaRow(evento: EventoOnChain) {
  return {
    tipo: evento.tipo,
    oferta_address: evento.ofertaAddress,
    oferta_index: evento.ofertaIndex,
    investidor: evento.investidor,
    valor_wei: evento.valorWei !== null ? evento.valorWei.toString() : null,
    cotas: evento.cotas !== null ? evento.cotas.toString() : null,
    taxa_wei: evento.taxaWei !== null ? evento.taxaWei.toString() : null,
    tx_hash: evento.txHash,
    block_number: evento.blockNumber.toString(),
    block_timestamp: evento.timestamp,
  };
}

async function main() {
  const addresses = getOnChainAddresses();
  if (!addresses) {
    console.error("NEXT_PUBLIC_MOCKBRL_ADDRESS / NEXT_PUBLIC_OFERTAS_ONCHAIN ausentes ou inválidos — nada a fazer.");
    process.exit(1);
  }

  const admin = createAdminClient();
  const client = publicClient();

  const { data: syncState, error: syncError } = await admin
    .from("onchain_sync_state")
    .select("last_synced_block, mock_brl_address")
    .eq("id", 1)
    .maybeSingle();
  if (syncError) throw syncError;

  const redeployDetectado = syncState !== null && syncState.mock_brl_address !== addresses.mockBrl.toLowerCase();

  let fromBlock: bigint;
  if (!syncState || redeployDetectado) {
    fromBlock = await encontrarBlocoDeploy(client, addresses.mockBrl);
    if (redeployDetectado) {
      console.log(
        `Endereço de MockBRL mudou (era ${syncState?.mock_brl_address}, agora ${addresses.mockBrl}) — recalculando bloco de deploy: ${fromBlock}.`,
      );
    }
  } else {
    fromBlock = BigInt(syncState.last_synced_block) + BigInt(1);
  }

  const toBlock = await client.getBlockNumber();

  if (fromBlock > toBlock) {
    console.log(`Já sincronizado até o bloco ${toBlock} — nada a fazer.`);
    return;
  }

  console.log(`Escaneando ${addresses.ofertas.length} oferta(s) de ${fromBlock} até ${toBlock} (${toBlock - fromBlock + BigInt(1)} blocos)...`);
  console.log("Pode demorar alguns minutos na primeira vez — sem pressa, este script não tem limite de 60s.");

  const eventos = await fetchEventosOnChainRange(client, addresses.ofertas, fromBlock, toBlock);
  console.log(`${eventos.length} evento(s) encontrado(s).`);

  if (eventos.length > 0) {
    const { error: insertError } = await admin
      .from("onchain_events_cache")
      .upsert(eventos.map(eventoParaRow), { onConflict: "tx_hash,oferta_address,tipo" });
    if (insertError) throw insertError;
  }

  const { error: upsertSyncError } = await admin
    .from("onchain_sync_state")
    .upsert({ id: 1, last_synced_block: toBlock.toString(), mock_brl_address: addresses.mockBrl.toLowerCase() });
  if (upsertSyncError) throw upsertSyncError;

  console.log(`Cache atualizado até o bloco ${toBlock}. Pronto.`);
}

main().catch((error) => {
  console.error("Falha no backfill:", error);
  process.exit(1);
});
