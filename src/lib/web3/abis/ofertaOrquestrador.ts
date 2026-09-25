// ABI de OfertaOrquestrador (niara-contracts-PMEs/src/orquestracao/OfertaOrquestrador.sol) —
// canal self-service de criação de oferta pelo emissor (Fase 3, ver
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md deste repositório). Só a função usada pela sub-etapa 1
// (leitura do gate 4) por ora — extraída, não escrita à mão, do artefato do Foundry:
//
//   cd niara-contracts-PMEs && forge build
//   node -e "console.log(JSON.stringify(require('./out/OfertaOrquestrador.sol/OfertaOrquestrador.json').abi.find(e => e.type === 'function' && e.name === 'emissoresAutorizados'), null, 2))"
//
// `criarOfertaCompleta`, o evento `OfertaCompletaCriada` e os 10 erros customizados do
// contrato entram por essa mesma extração quando a Fase 3 chegar à sub-etapa de escrita — não
// adicionar nenhuma entrada nova aqui de memória.
export const ofertaOrquestradorAbi = [
  {
    type: "function",
    name: "emissoresAutorizados",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
] as const;
