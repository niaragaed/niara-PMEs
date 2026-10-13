// Minimal OfertaCaptacaoFactory ABI (niara-contracts-PMEs/src/captacao/OfertaCaptacaoFactory.sol)
// — only `isCaptacao`, used by confirmPublication() (Phase 3) to confirm that the offering
// returned by the OfertaCompletaCriada event was really registered by this factory, not just that
// "some contract exists at that address". Extracted, not hand-written:
//
//   cd niara-contracts-PMEs && forge build
//   node -e "console.log(JSON.stringify(require('./out/OfertaCaptacaoFactory.sol/OfertaCaptacaoFactory.json').abi.find(e => e.type === 'function' && e.name === 'isCaptacao'), null, 2))"
export const ofertaCaptacaoFactoryAbi = [
  {
    type: "function",
    name: "isCaptacao",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
] as const;
