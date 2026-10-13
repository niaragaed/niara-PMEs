// Registry that picks, by environment variable, which implementation of
// each port (src/lib/ports.ts) the rest of the app uses. Without the env set (or
// with an unknown value), the default is always the mock — it never falls back
// "silently" to a real implementation by mistake.
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
