// Implementações MOCK das portas em src/lib/ports.ts.
//
// 🔴 Nada aqui move dinheiro de verdade, faz verificação de identidade de
// verdade nem emite token on-chain de verdade. Todo ref/tx retornado por
// estas implementações começa com o prefixo "MOCK-", seguindo a regra de
// honestidade do projeto (nada simulado pode parecer real) — o front
// nunca deve exibir um ref "MOCK-*" como se fosse uma operação real.
import type {
  ChainIssuanceResult,
  ChainRegistry,
  EscrowIntent,
  KycProvider,
  KycSubmissionResult,
  PaymentGateway,
} from "./ports";

function mockRef(prefixo: string): string {
  return `MOCK-${prefixo}-${crypto.randomUUID()}`;
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
