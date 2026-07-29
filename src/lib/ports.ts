// Portas (interfaces) da arquitetura hexagonal (ports & adapters) do
// backend da Niara PMEs. Puro TypeScript — nenhuma implementação aqui, só
// os contratos que os adapters (mock ou reais) precisam cumprir. Ver
// src/lib/mocks.ts (implementação mock) e src/lib/adapters.ts (registry
// que escolhe a implementação por variável de ambiente).

/**
 * Status possíveis de uma intenção de escrow (pagamento retido até
 * liberação para o emissor da oferta, ou devolução ao investidor).
 */
export type EscrowStatus =
  | "pending"
  | "held"
  | "released"
  | "refunded"
  | "failed";

export interface EscrowIntent {
  /** Referência externa do gateway de pagamento (idempotente). */
  ref: string;
  status: EscrowStatus;
}

/**
 * Porta de pagamento: abre e resolve um escrow off-chain entre investidor e
 * emissor da oferta. Nenhuma implementação real move dinheiro nesta etapa.
 */
export interface PaymentGateway {
  createEscrowIntent(params: {
    ofertaId: string;
    investidorId: string;
    valorCentavos: number;
  }): Promise<EscrowIntent>;

  confirmPayment(ref: string): Promise<EscrowIntent>;

  releaseToIssuer(ref: string): Promise<EscrowIntent>;

  refund(ref: string): Promise<EscrowIntent>;
}

/**
 * Status possíveis de uma submissão de KYC (Conheça seu Cliente).
 */
export type KycStatus = "pending" | "in_review" | "approved" | "rejected";

export interface KycSubmissionResult {
  /** Referência externa do provedor de KYC. */
  ref: string;
  status: KycStatus;
}

/**
 * Porta de KYC: envia documentos/dados de um usuário para verificação de
 * identidade e consulta o status dessa verificação junto ao provedor.
 */
export interface KycProvider {
  submit(params: {
    usuarioId: string;
    documento: string;
  }): Promise<KycSubmissionResult>;

  status(ref: string): Promise<KycSubmissionResult>;
}

/**
 * Status possíveis de uma emissão de tokens on-chain.
 */
export type ChainIssuanceStatus = "pending" | "confirmed" | "failed";

export interface ChainIssuanceResult {
  /** Hash/referência externa da transação (ou equivalente mock). */
  ref: string;
  status: ChainIssuanceStatus;
}

/**
 * Porta de registro on-chain: emite tokens representando a participação de
 * uma oferta. Só terá implementação real quando os smart contracts das
 * PMEs estiverem prontos — por ora existe apenas como contrato/porta.
 */
export interface ChainRegistry {
  issueTokens(params: {
    ofertaId: string;
    investidorId: string;
    quantidade: number;
  }): Promise<ChainIssuanceResult>;
}
