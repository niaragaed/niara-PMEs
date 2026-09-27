// ABI mínimo de ParticipacaoTokenFactory (niara-contracts-PMEs/src/token/ParticipacaoTokenFactory.sol)
// — só `isOferta`, usado por confirmarPublicacao() (Fase 3) para confirmar que o token
// devolvido pelo evento OfertaCompletaCriada foi realmente registrado por esta factory, não só
// "existe algum contrato nesse endereço". Extraído, não escrito à mão:
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
