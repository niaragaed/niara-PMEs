// ABI mínimo de OfertaCaptacaoFactory (niara-contracts-PMEs/src/captacao/OfertaCaptacaoFactory.sol)
// — só `isCaptacao`, usado por confirmarPublicacao() (Fase 3) para confirmar que a oferta
// devolvida pelo evento OfertaCompletaCriada foi realmente registrada por esta factory, não só
// "existe algum contrato nesse endereço". Extraído, não escrito à mão:
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
