// MOCK implementations of the ports in src/lib/ports.ts.
//
// 🔴 Nothing here moves real money, does real identity verification
// or issues a real on-chain token. Every ref/tx returned by
// these implementations starts with the "MOCK-" prefix, following the project's
// honesty rule (nothing simulated may look real) — the frontend
// must never display a "MOCK-*" ref as if it were a real operation.
import type {
  ChainIssuanceResult,
  ChainRegistry,
  EscrowIntent,
  KycProvider,
  KycSubmissionResult,
  PaymentGateway,
} from "./ports";

function mockRef(prefix: string): string {
  return `MOCK-${prefix}-${crypto.randomUUID()}`;
}

export const mockPaymentGateway: PaymentGateway = {
  async createEscrowIntent(): Promise<EscrowIntent> {
    return { ref: mockRef("ESCROW"), status: "pending" };
  },

  async confirmPayment(ref: string): Promise<EscrowIntent> {
    return { ref, status: "held" };
  },

  async releaseToIssuer(ref: string): Promise<EscrowIntent> {
    return { ref, status: "released" };
  },

  async refund(ref: string): Promise<EscrowIntent> {
    return { ref, status: "refunded" };
  },
};

export const mockKycProvider: KycProvider = {
  async submit(): Promise<KycSubmissionResult> {
    return { ref: mockRef("KYC"), status: "approved" };
  },

  async status(ref: string): Promise<KycSubmissionResult> {
    return { ref, status: "pending" };
  },
};

export const mockChainRegistry: ChainRegistry = {
  async issueTokens(): Promise<ChainIssuanceResult> {
    return { ref: mockRef("TX"), status: "pending" };
  },
};
