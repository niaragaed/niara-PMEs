// Espelha 1:1 as constantes fixas de script/DemoNiaraPMEsOnChain.s.sol (repo irmão
// niara-contracts-PMEs) — as 10 ofertas reais em Sepolia são todas criadas com esses mesmos
// parâmetros (confirmado via `cast call` antes de escrever este arquivo, ver CLAUDE.md, "10
// ofertas de reserva para o Startup Summit"). Fonte única de verdade: nunca duplicar estes
// números em outro arquivo. Se o script mudar, atualizar aqui manualmente — não há sincronização
// automática entre os dois repositórios.
//
// Unidade é sempre mBRL (MockBRL) — moeda de teste sem lastro, nunca rotular como "R$" na UI
// (ver src/lib/mock/ofertasOnChain.ts e PmesOnChainCard.tsx, que consomem estas constantes).
export const ONCHAIN_SMES_MIN_TARGET_MBRL = 100;
export const ONCHAIN_SMES_MAX_TARGET_MBRL = 200;
export const ONCHAIN_SMES_PRICE_PER_SHARE_MBRL = 10;
export const ONCHAIN_SMES_CAP_PER_INVESTOR_MBRL = 200;
export const ONCHAIN_SMES_AUTHORIZED_SHARES = 20;
// Prazo exato de cada oferta é sempre lido on-chain (useOfertaOnChainTermos().prazo) — nunca
// deste valor, que é só uma referência aproximada para textos estáticos que precisem citar "~180
// dias" sem fazer uma leitura on-chain.
export const ONCHAIN_SMES_DEADLINE_DAYS = 180;
