// Centraliza a leitura/escrita dos contratos on-chain da demo real em Sepolia — pareia cada
// endereço com seu ABI (src/lib/web3/abis/), no formato que os hooks do wagmi
// (`useReadContract`/`useWriteContract`/`useReadContracts`) esperam via spread
// (`{ ...ofertaCaptacaoContract, functionName: "..." }`). Nenhum componente React deve montar
// esse par address+abi na mão.
//
// Desde a Fase 4 (sub-etapa 5.2, ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md), este módulo não
// resolve mais "qual oferta" a partir de um índice na lista legada
// (`NEXT_PUBLIC_OFERTAS_ONCHAIN`, ver addresses.ts) — recebe o par de endereços já resolvido
// pelo chamador, que hoje pode vir de duas origens: a lista legada (env var, ofertas criadas por
// script administrativo) ou o Supabase (`loadConfirmedOnChainOfferings`, ofertas publicadas pelo
// self-service e já confirmadas). Este módulo não sabe nem precisa saber a origem — só monta o
// par address+abi.
import { mockBrlAbi } from "./abis/mockBrl";
import { ofertaCaptacaoAbi } from "./abis/ofertaCaptacao";
import { participacaoTokenAbi } from "./abis/participacaoToken";

export type OnChainContracts = {
  ofertaCaptacao: { address: `0x${string}`; abi: typeof ofertaCaptacaoAbi };
  participacaoToken: { address: `0x${string}`; abi: typeof participacaoTokenAbi };
};

export type OfertaOnChainEnderecos = {
  token: `0x${string}`;
  oferta: `0x${string}`;
};

/**
 * 🔴 Este módulo NÃO resolve mais o MockBRL — incidente real corrigido: uma versão anterior
 * desta função devolvia um endereço de MockBRL fixo (`NEXT_PUBLIC_MOCKBRL_ADDRESS`), com o
 * comentário afirmando "MockBRL é compartilhado por TODAS as ofertas, legadas e self-service".
 * Essa afirmação estava ERRADA — nunca foi verificada linha a linha contra as ofertas
 * self-service de verdade, só assumida. Confirmado via `cast call` depois de um incidente real de
 * aporte (ver CLAUDE.md, "Tela /investir/onchain"): as ofertas legadas (criadas pelo script
 * administrativo) de fato compartilham um único `MockBRL` (`0xb99dda4e...`, o valor do env var) —
 * mas as ofertas self-service (criadas via `OfertaOrquestrador.criarOfertaCompleta`) usam um
 * `MockBRL` PRÓPRIO do orquestrador (`0xEC377e00e022675B67Da6ab1966Bc0764bF792A4`), diferente do
 * env var. Ler o MockBRL como constante global fazia a tela aprovar e consultar allowance contra
 * o token ERRADO para qualquer oferta self-service — o `approve` minerava com sucesso (contra o
 * MockBRL errado), o allowance da oferta de verdade continuava zero, e `aportar` revertia com
 * `ERC20InsufficientAllowance`.
 *
 * **Correção**: o MockBRL de uma oferta é sempre `OfertaCaptacao.moeda()` — lido on-chain, da
 * PRÓPRIA oferta selecionada, nunca de uma env var nem de um valor herdado de outro hook. Cada
 * hook que precisa de MockBRL (`useOfertaOnChainTermos`, `useMinhaPosicaoOnChain`,
 * `useMintMockBrl`, `useInvestirOnChain`) lê `moeda()` da sua própria oferta, de forma
 * independente — nenhum confia num valor resolvido por outro hook, pelo mesmo princípio já
 * aplicado ao allowance (nunca decidir com uma leitura que não é a sua própria).
 */
export function getMockBrlContractAt(address: `0x${string}`): { address: `0x${string}`; abi: typeof mockBrlAbi } {
  return { address, abi: mockBrlAbi };
}

/**
 * Retorna `null` (nunca lança) quando `enderecos` é `null`. Só pareia os dois endereços já
 * conhecidos estaticamente (token/oferta) com seus ABIs — nunca faz leitura on-chain nenhuma
 * (por isso não inclui mais `mockBrl`, que exige ler `moeda()` da própria oferta primeiro — ver
 * `getMockBrlContractAt`).
 */
export function getOnChainContracts(enderecos: OfertaOnChainEnderecos | null): OnChainContracts | null {
  if (!enderecos) return null;

  return {
    ofertaCaptacao: { address: enderecos.oferta, abi: ofertaCaptacaoAbi },
    participacaoToken: { address: enderecos.token, abi: participacaoTokenAbi },
  };
}
