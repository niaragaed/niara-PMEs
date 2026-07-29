// Registry que escolhe, por variável de ambiente, qual implementação de
// cada porta (src/lib/ports.ts) o resto do app usa. Sem a env definida (ou
// com um valor desconhecido), o default é sempre o mock — nunca falha
// "silenciosamente" para uma implementação real por engano.
import { mockChainRegistry, mockKycProvider, mockPaymentGateway } from "./mocks";
import type { ChainRegistry, KycProvider, PaymentGateway } from "./ports";

function resolvePaymentGateway(): PaymentGateway {
  switch (process.env.NIARA_PAYMENT_ADAPTER) {
    case "mock":
    default:
      return mockPaymentGateway;
  }
}

function resolveKycProvider(): KycProvider {
  switch (process.env.NIARA_KYC_ADAPTER) {
    case "mock":
    default:
      return mockKycProvider;
  }
}

function resolveChainRegistry(): ChainRegistry {
  switch (process.env.NIARA_CHAIN_ADAPTER) {
    case "mock":
    default:
      return mockChainRegistry;
  }
}

export const payments: PaymentGateway = resolvePaymentGateway();
export const kyc: KycProvider = resolveKycProvider();
export const chain: ChainRegistry = resolveChainRegistry();
