// Minimal ParticipacaoTokenFactory ABI (niara-contracts-PMEs/src/token/ParticipacaoTokenFactory.sol)
// — only `isOferta`, used by confirmPublication() (Phase 3) to confirm that the token returned by
// the OfertaCompletaCriada event was really registered by this factory, not just that "some
// contract exists at that address". Extracted, not hand-written:
//
//   cd niara-contracts-PMEs && forge build
//   node -e "console.log(JSON.stringify(require('./out/ParticipacaoTokenFactory.sol/ParticipacaoTokenFactory.json').abi.find(e => e.type === 'function' && e.name === 'isOferta'), null, 2))"
export const participacaoTokenFactoryAbi = [
  {
    type: "function",
    name: "isOferta",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
] as const;
