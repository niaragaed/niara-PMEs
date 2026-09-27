// ABI de OfertaOrquestrador (niara-contracts-PMEs/src/orquestracao/OfertaOrquestrador.sol) —
// canal self-service de criação de oferta pelo emissor (Fase 3, ver
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md deste repositório). Só a superfície que o frontend
// realmente usa (leitura do gate 4, escrita de `criarOfertaCompleta`, o evento que ela emite e
// os erros customizados que ela pode reverter) — extraída, não escrita à mão, do artefato do
// Foundry:
//
//   cd niara-contracts-PMEs && forge build
//   node -e "console.log(JSON.stringify(require('./out/OfertaOrquestrador.sol/OfertaOrquestrador.json').abi.find(e => e.type === 'function' && e.name === 'emissoresAutorizados'), null, 2))"
//   node -e "console.log(JSON.stringify(require('./out/OfertaOrquestrador.sol/OfertaOrquestrador.json').abi.find(e => e.type === 'function' && e.name === 'criarOfertaCompleta'), null, 2))"
//   node -e "console.log(JSON.stringify(require('./out/OfertaOrquestrador.sol/OfertaOrquestrador.json').abi.find(e => e.type === 'event' && e.name === 'OfertaCompletaCriada'), null, 2))"
//   node -e "console.log(JSON.stringify(require('./out/OfertaOrquestrador.sol/OfertaOrquestrador.json').abi.filter(e => e.type === 'error' && ['ZeroAddress','EmissorNaoAutorizado','OfertaAnteriorAindaAberta','PrecoInvalido','PrazoInvalido','PrazoExcedeLimite','MetaMaximaExcedeTeto','LoteAdicionalExcedeLimite','PrecoNaoDivideMetaMaxima','TaxaExcedeMaximo'].includes(e.name)), null, 2))"
//   node -e "console.log(JSON.stringify(require('./out/OfertaOrquestrador.sol/OfertaOrquestrador.json').abi.find(e => e.type === 'function' && e.name === 'tokenFactory'), null, 2))"
//   node -e "console.log(JSON.stringify(require('./out/OfertaOrquestrador.sol/OfertaOrquestrador.json').abi.find(e => e.type === 'function' && e.name === 'captacaoFactory'), null, 2))"
//
// `tokenFactory`/`captacaoFactory` (getters de `address public immutable`, ver o .sol) foram
// adicionados na Fase 3 para confirmarPublicacao() poder achar as duas factories a partir do
// próprio orquestrador — em vez de precisar de mais duas env vars — e checar que o token/oferta
// do evento realmente foram registrados nelas (ver achado do EIP-7702, CLAUDE.md).
//
// Os demais erros herdados de AccessControl/Pausable/TimelockedAccessControl (ex.:
// AccessControlUnauthorizedAccount, EnforcedPause) não entram aqui — o gate 4 já impede o
// emissor de chegar a um estado onde eles seriam alcançáveis pelo canal self-service; se algum
// deles reverter mesmo assim, describeOnChainError() já tem um fallback nomeado genérico
// (`"A transação reverteu (${errorName})."`), nunca "Execution reverted" cru.
export const ofertaOrquestradorAbi = [
  {
    type: "function",
    name: "emissoresAutorizados",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenFactory",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "captacaoFactory",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "criarOfertaCompleta",
    inputs: [
      { name: "nome", type: "string", internalType: "string" },
      { name: "simbolo", type: "string", internalType: "string" },
      { name: "empresa", type: "string", internalType: "string" },
      { name: "cnpjRef", type: "bytes32", internalType: "bytes32" },
      { name: "serie", type: "string", internalType: "string" },
      { name: "metaMinima", type: "uint256", internalType: "uint256" },
      { name: "metaMaxima", type: "uint256", internalType: "uint256" },
      { name: "precoPorCota", type: "uint256", internalType: "uint256" },
      { name: "prazo", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "oferta", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "OfertaCompletaCriada",
    inputs: [
      { name: "emissor", type: "address", indexed: true, internalType: "address" },
      { name: "token", type: "address", indexed: true, internalType: "address" },
      { name: "oferta", type: "address", indexed: true, internalType: "address" },
      { name: "metaMinima", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "metaMaxima", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "precoPorCota", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "prazo", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "EmissorNaoAutorizado", inputs: [{ name: "emissor", type: "address", internalType: "address" }] },
  { type: "error", name: "OfertaAnteriorAindaAberta", inputs: [{ name: "oferta", type: "address", internalType: "address" }] },
  { type: "error", name: "PrecoInvalido", inputs: [] },
  { type: "error", name: "PrazoInvalido", inputs: [{ name: "prazo", type: "uint256", internalType: "uint256" }] },
  {
    type: "error",
    name: "PrazoExcedeLimite",
    inputs: [
      { name: "prazo", type: "uint256", internalType: "uint256" },
      { name: "limite", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "MetaMaximaExcedeTeto",
    inputs: [
      { name: "metaMaxima", type: "uint256", internalType: "uint256" },
      { name: "teto", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "LoteAdicionalExcedeLimite",
    inputs: [
      { name: "metaMaxima", type: "uint256", internalType: "uint256" },
      { name: "metaMinima", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "PrecoNaoDivideMetaMaxima",
    inputs: [
      { name: "metaMaxima", type: "uint256", internalType: "uint256" },
      { name: "precoPorCota", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TaxaExcedeMaximo",
    inputs: [
      { name: "taxaBps", type: "uint256", internalType: "uint256" },
      { name: "maximo", type: "uint256", internalType: "uint256" },
    ],
  },
] as const;
