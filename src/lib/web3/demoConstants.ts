// Espelha 1:1 as constantes fixas de script/DemoNiaraPMEsOnChain.s.sol (repo irmão
// niara-contracts-PMEs) — as 10 ofertas reais em Sepolia são todas criadas com esses mesmos
// parâmetros (confirmado via `cast call` antes de escrever este arquivo, ver CLAUDE.md, "10
// ofertas de reserva para o Startup Summit"). Fonte única de verdade: nunca duplicar estes
// números em outro arquivo. Se o script mudar, atualizar aqui manualmente — não há sincronização
// automática entre os dois repositórios.
//
// Unidade é sempre mBRL (MockBRL) — moeda de teste sem lastro, nunca rotular como "R$" na UI
// (ver src/lib/mock/ofertasOnChain.ts e PmesOnChainCard.tsx, que consomem estas constantes).
export const ONCHAIN_PMES_META_MINIMA_MBRL = 100;
export const ONCHAIN_PMES_META_MAXIMA_MBRL = 200;
export const ONCHAIN_PMES_PRECO_POR_COTA_MBRL = 10;
export const ONCHAIN_PMES_TETO_POR_INVESTIDOR_MBRL = 200;
export const ONCHAIN_PMES_COTAS_AUTORIZADAS = 20;
// Prazo exato de cada oferta é sempre lido on-chain (useOfertaOnChainTermos().prazo) — nunca
// deste valor, que é só uma referência aproximada para textos estáticos que precisem citar "~180
// dias" sem fazer uma leitura on-chain.
export const ONCHAIN_PMES_PRAZO_DIAS = 180;
