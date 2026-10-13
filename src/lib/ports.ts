// Ports (interfaces) of the Niara PMEs backend's hexagonal architecture (ports & adapters).
// Pure TypeScript — no implementation here, only the contracts the adapters (mock or real)
// must fulfill. See src/lib/mocks.ts (mock implementation) and src/lib/adapters.ts (the registry
// that picks the implementation by environment variable).

/**
 * Possible statuses of an escrow intent (payment held until it's
 * released to the offering's issuer, or returned to the investor).
 */
export type EscrowStatus =
  | "pending"
  | "held"
  | "released"
  | "refunded"
  | "failed";

export interface EscrowIntent {
  /** The payment gateway's external reference (idempotent). */
  ref: string;
  status: EscrowStatus;
}

/**
 * Payment port: opens and resolves an off-chain escrow between the investor and the
 * offering's issuer. No implementation moves real money at this stage.
 */
export interface PaymentGateway {
  createEscrowIntent(params: {
    offeringId: string;
    investorId: string;
    amountCents: number;
  }): Promise<EscrowIntent>;

  confirmPayment(ref: string): Promise<EscrowIntent>;

  releaseToIssuer(ref: string): Promise<EscrowIntent>;

  refund(ref: string): Promise<EscrowIntent>;
}

/**
 * Possible statuses of a KYC (Know Your Customer) submission.
 */
export type KycStatus = "pending" | "in_review" | "approved" | "rejected";

export interface KycSubmissionResult {
  /** The KYC provider's external reference. */
  ref: string;
  status: KycStatus;
}

/**
 * KYC port: sends a user's documents/data for identity verification and checks the status of
 * that verification with the provider.
 */
export interface KycProvider {
  submit(params: {
    userId: string;
    document: string;
  }): Promise<KycSubmissionResult>;

  status(ref: string): Promise<KycSubmissionResult>;
}

/**
 * Possible statuses of an on-chain token issuance.
 */
export type ChainIssuanceStatus = "pending" | "confirmed" | "failed";

export interface ChainIssuanceResult {
  /** The transaction's hash/external reference (or a mock equivalent). */
  ref: string;
  status: ChainIssuanceStatus;
}

/**
 * On-chain registry port: issues tokens representing a stake in an offering. It will only have
 * a real implementation once the SME smart contracts are ready — for now it exists only as a
 * contract/port.
 */
export interface ChainRegistry {
  issueTokens(params: {
    offeringId: string;
    investorId: string;
    quantity: number;
  }): Promise<ChainIssuanceResult>;
}
