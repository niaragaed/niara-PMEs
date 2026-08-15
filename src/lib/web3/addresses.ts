// Endereços dos contratos reais em Sepolia usados pela integração on-chain (ver
// CLAUDE.md, seção "Investimento real em Sepolia"). Nunca hardcodar endereço de contrato
// dentro de componente React — sempre passar por aqui, mesmo padrão de centralização já usado
// para as demais variáveis de ambiente do projeto.
//
// Suporta VÁRIAS ofertas simultâneas (`NEXT_PUBLIC_OFERTAS_ONCHAIN`) — pensado para uma demo
// presencial (ex.: estande de evento) onde o apresentador troca de oferta a cada visitante sem
// precisar de um novo deploy (env vars `NEXT_PUBLIC_*` ficam embutidas no build no Vercel — só
// alternar o valor não republica o site). Cada oferta é criada uma única vez por um script
// administrativo fora do frontend (niara-contracts-PMEs/script/DemoNiaraPMEsOnChain.s.sol) —
// este projeto nunca cria ofertas on-chain dinamicamente. `MockBRL` é compartilhado por todas
// as ofertas (mesma infraestrutura, ver aquele script).

const HEX_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export type OfertaOnChainAddresses = {
  token: `0x${string}`;
  oferta: `0x${string}`;
};

export type OnChainAddresses = {
  mockBrl: `0x${string}`;
  ofertas: OfertaOnChainAddresses[];
};

function readAddress(value: string | undefined): `0x${string}` | null {
  if (!value || !HEX_ADDRESS_PATTERN.test(value)) return null;
  return value as `0x${string}`;
}

// Formato: "token1:oferta1;token2:oferta2;..." — delimitadores simples de propósito, para
// evitar problemas de escaping de JSON dentro de um valor de variável de ambiente.
function parseOfertas(value: string | undefined): OfertaOnChainAddresses[] {
  if (!value) return [];

  return value
    .split(";")
    .map((par) => par.trim())
    .filter(Boolean)
    .map((par) => {
      const [tokenRaw, ofertaRaw] = par.split(":").map((parte) => parte?.trim());
      return { token: readAddress(tokenRaw), oferta: readAddress(ofertaRaw) };
    })
    .filter((par): par is OfertaOnChainAddresses => Boolean(par.token && par.oferta));
}

/**
 * Lê o endereço do `MockBRL` e a lista de ofertas das variáveis de ambiente `NEXT_PUBLIC_*`.
 * Retorna `null` (nunca lança) quando `MockBRL` está ausente/mal formado ou a lista de ofertas
 * está vazia — a UI trata esse caso como "contrato sem endereço configurado" (ver
 * src/lib/web3/errors.ts) em vez de quebrar a renderização.
 */
export function getOnChainAddresses(): OnChainAddresses | null {
  const mockBrl = readAddress(process.env.NEXT_PUBLIC_MOCKBRL_ADDRESS);
  const ofertas = parseOfertas(process.env.NEXT_PUBLIC_OFERTAS_ONCHAIN);

  if (!mockBrl || ofertas.length === 0) return null;

  return { mockBrl, ofertas };
}
