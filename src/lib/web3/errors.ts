// Traduz erros de leitura/escrita on-chain (rejeição de assinatura, revert de contrato, RPC
// fora do ar etc.) para mensagens compreensíveis em pt-BR. Usado pelos hooks de escrita
// (src/lib/web3/hooks/*) — nunca deixar um erro técnico do viem/wagmi vazar direto para a UI.
// Pré-condições que a própria UI já sabe checar antes de chamar o contrato (MetaMask ausente,
// carteira desconectada, rede errada, endereço de contrato não configurado) NÃO passam por
// aqui — são estados explícitos dos componentes, não exceções capturadas.
import {
  BaseError,
  ContractFunctionRevertedError,
  HttpRequestError,
  InsufficientFundsError,
  RpcRequestError,
  TimeoutError,
  UserRejectedRequestError,
} from "viem";

// Nomes de erro customizado (`error X()` do Solidity) -> mensagem em pt-BR. Nomes conferidos
// diretamente contra niara-contracts-PMEs/src/captacao/OfertaCaptacao.sol e
// niara-contracts-PMEs/out/MockBRL.sol/MockBRL.json — não presumidos.
const CUSTOM_ERROR_MESSAGES: Record<string, string> = {
  AporteNaoMultiploDoPreco: "O valor precisa ser múltiplo exato do preço por cota.",
  EncerramentoPrematuro: "A oferta ainda não pode ser encerrada — falta atingir o prazo ou a meta máxima exata.",
  EnforcedPause: "Os aportes desta oferta estão pausados no momento.",
  ExcedeMetaMaxima: "Esse valor ultrapassaria a meta máxima da oferta.",
  ExcedeTetoInvestidor: "Esse valor ultrapassaria o teto por investidor desta oferta.",
  JaReembolsado: "Este aporte já foi reembolsado.",
  JaResgatado: "Você já resgatou as cotas deste aporte.",
  NadaAReembolsar: "Não há nada a reembolsar para esta carteira.",
  NadaAResgatar: "Não há cotas a resgatar para esta carteira.",
  NaoAutorizado: "Esta carteira não está autorizada a executar esta ação.",
  OfertaNaoAberta: "A oferta não está aberta para aportes no momento.",
  OfertaNaoEncerradaComFalha: "A oferta não foi encerrada com fracasso.",
  OfertaNaoEncerradaComSucesso: "A oferta ainda não foi encerrada com sucesso — encerre antes de resgatar.",
  PrazoExpirado: "O prazo desta oferta já expirou.",
  RecursosJaLiberados: "Os recursos desta oferta já foram liberados ao emissor.",
  ERC20InsufficientAllowance: "Autorização (allowance) insuficiente para o MockBRL — tente aprovar novamente.",
  ERC20InsufficientBalance: "Saldo insuficiente de MockBRL para esta operação.",

  // OfertaOrquestrador (Fase 3, publicação self-service) — nomes conferidos direto contra
  // niara-contracts-PMEs/src/orquestracao/OfertaOrquestrador.sol. A maioria não deveria ser
  // alcançável na prática (os valores da oferta já passaram pelos CHECKs do Supabase antes de
  // chegar a 'draft' — ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md, seção 8), mas mapeados mesmo
  // assim: se algum aparecer de verdade, é sinal de uma divergência entre os limites
  // espelhados no Postgres e os limites reais do contrato, e merece uma frase real, não um
  // "Execution reverted" cru nem um alarme falso de bug de UI.
  ZeroAddress: "Configuração inválida do contrato — avise a Niara.",
  EmissorNaoAutorizado: "Sua carteira ainda não está autorizada a publicar ofertas — fale com a Niara para liberar o acesso.",
  OfertaAnteriorAindaAberta: "Você já tem uma oferta em aberto em Sepolia — encerre-a antes de publicar uma nova.",
  PrecoInvalido: "O valor por cota não pode ser zero.",
  PrazoInvalido: "O prazo da oferta precisa ser no futuro.",
  PrazoExcedeLimite: "O prazo da oferta ultrapassa o limite de 180 dias da Resolução CVM 88.",
  MetaMaximaExcedeTeto: "O valor da oferta ultrapassa o teto de R$15 milhões por oferta.",
  LoteAdicionalExcedeLimite: "O lote adicional ultrapassa 25% da oferta original.",
  PrecoNaoDivideMetaMaxima: "O valor da oferta precisa ser múltiplo exato do valor por cota.",
  TaxaExcedeMaximo: "Configuração de taxa da plataforma inválida — avise a Niara.",
};

/**
 * Converte qualquer erro capturado de uma leitura/escrita on-chain numa mensagem pt-BR
 * apresentável. Nunca lança — sempre retorna uma string.
 */
export function describeOnChainError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return "Você cancelou a assinatura na carteira.";
    }

    const revertError = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName;
      if (errorName && errorName in CUSTOM_ERROR_MESSAGES) {
        return CUSTOM_ERROR_MESSAGES[errorName];
      }
      if (errorName) return `A transação reverteu (${errorName}).`;
    }

    // Checados por classe real do viem (error.walk + instanceof), não por regex sobre
    // shortMessage — texto de shortMessage varia por classe e não contém palavras-chave
    // confiáveis (ex.: HttpRequestError.shortMessage é só "HTTP request failed.", sem
    // "network"/"rpc"/"timeout"; InsufficientFundsError.shortMessage não contém
    // "insufficient funds" em lugar nenhum). Conferido direto em
    // node_modules/viem/_esm/errors/{node,request}.js antes de escrever isto.
    if (error.walk((e) => e instanceof InsufficientFundsError)) {
      return "Saldo de ETH de Sepolia insuficiente para pagar o gas desta transação.";
    }
    if (error.walk((e) => e instanceof HttpRequestError || e instanceof TimeoutError || e instanceof RpcRequestError)) {
      return "Não foi possível falar com o RPC de Sepolia. Tente novamente em instantes.";
    }

    return error.shortMessage ?? error.message;
  }

  if (error instanceof Error) return error.message;
  return "Erro desconhecido ao processar a transação.";
}
