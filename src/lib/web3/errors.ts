// Translates on-chain read/write errors (signature rejection, contract revert, RPC down etc.)
// into understandable messages in the interface language. Used by the write hooks
// (src/lib/web3/hooks/*) and the publication Server Actions — never let a technical viem/wagmi
// error leak straight into the UI. Preconditions the UI itself already knows how to check before
// calling the contract (MetaMask missing, wallet disconnected, wrong network, contract address
// not configured) DON'T go through here — they are explicit component states, not caught
// exceptions.
import {
  BaseError,
  ContractFunctionRevertedError,
  HttpRequestError,
  InsufficientFundsError,
  RpcRequestError,
  TimeoutError,
  UserRejectedRequestError,
} from "viem";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Custom error names (Solidity `error X()`) -> message, in the dictionary (chainErrors.evm.custom).
// Names checked directly against niara-contracts-PMEs/src/captacao/OfertaCaptacao.sol,
// niara-contracts-PMEs/src/orquestracao/OfertaOrquestrador.sol and
// niara-contracts-PMEs/out/MockBRL.sol/MockBRL.json — not assumed.
//
// 🔴 The allowance error is mapped twice: by name (ERC20InsufficientAllowance) and by the RAW
// selector (0xfb8f41b2 = keccak256 of "ERC20InsufficientAllowance(address,uint256,uint256)").
// When `aportar()` (OfertaCaptacao) reverts because the INTERNAL call to
// `moeda.safeTransferFrom` (MockBRL) failed, viem decodes against `ofertaCaptacaoAbi` — which
// doesn't declare this error (it belongs to the ERC20, not to OfertaCaptacao) — so it can't
// resolve the name and uses the raw selector as `errorName`. Decoding against `mockBrlAbi`
// directly (e.g. an `approve` reverting) resolves it by name normally; only the `aportar()`
// simulation sees the error from the outside, without the right ABI to name it.
//
// The OfertaOrquestrador errors (Phase 3, self-service publication) shouldn't be reachable in
// practice (the offering's values already went through the Supabase CHECKs before reaching
// 'draft' — see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md, section 8), but they're mapped anyway: if one
// shows up for real, it's a sign of a mismatch between the limits mirrored in Postgres and the
// contract's real limits, and it deserves a real sentence, not a raw "Execution reverted" nor a
// false alarm about a UI bug. Five of them (PrecoInvalido, PrazoInvalido, PrazoExcedeLimite,
// MetaMaximaExcedeTeto, LoteAdicionalExcedeLimite, PrecoNaoDivideMetaMaxima) are violations of
// the offering's OWN values — permanent: the numbers are already recorded in the offering, so
// publishing again reverts exactly the same way. Their messages therefore never suggest "try
// again" — always "recreate the offering".
export type EvmErrorMessages = Dictionary["chainErrors"]["evm"];

/**
 * Turns any error caught from an on-chain read/write into a presentable message (`messages` =
 * dict.chainErrors.evm, in the visitor's language). Never throws — always returns a string.
 */
export function describeOnChainError(error: unknown, messages: EvmErrorMessages): string {
  const custom: Record<string, string> = messages.custom;
  // 🔴 Always log the ORIGINAL, raw error before any translation — real incident: a decodable
  // revert was being classified as "RPC down" (see the revert block below), and the translated
  // message alone hid the real cause until someone looked at the browser's Network tab. Never
  // remove this log without an equivalent way of inspecting the raw error.
  console.error("[describeOnChainError] original error:", error);

  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return messages.userRejected;
    }

    // 🔴 A revert from the contract ITSELF — checked and ALWAYS returned here, before any
    // transport/RPC check below. Real incident, fixed: when `errorName` came back empty (a revert
    // without a decodable custom error — a raw string, a panic, or an error outside the ABI
    // passed), the old code returned nothing in this block and FELL THROUGH to the
    // Insufficient/Http/Timeout/Rpc checks below — and an "execution reverted" arrives as a
    // JSON-RPC error (the HTTP call succeeded, 200; the error is in the response body), so the
    // RpcRequestError `error.walk` could match ANY revert, not only a real RPC failure. Result: a
    // revert became "Couldn't reach the Sepolia RPC" — wrong about the cause AND the advice (a
    // revert isn't solved by "trying again in a moment"). That's why this whole block now always
    // returns as soon as it identifies ANY revert, decoded or not — it never falls through to
    // the transport checks again.
    const revertError = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName;
      if (errorName && errorName in custom) {
        return custom[errorName];
      }
      if (errorName) return messages.revertedNamed(errorName);
      return messages.reverted(revertError.shortMessage || null);
    }

    // Checked by viem's real class (error.walk + instanceof), not by a regex over shortMessage —
    // the shortMessage text varies by class and has no reliable keywords (e.g.
    // HttpRequestError.shortMessage is just "HTTP request failed.", without
    // "network"/"rpc"/"timeout"; InsufficientFundsError.shortMessage doesn't contain
    // "insufficient funds" anywhere). Checked directly in
    // node_modules/viem/_esm/errors/{node,request}.js before writing this. Only errors that are
    // NOT a contract revert get here (see the block above, which always returns first).
    if (error.walk((e) => e instanceof InsufficientFundsError)) {
      return messages.insufficientEth;
    }
    if (error.walk((e) => e instanceof HttpRequestError || e instanceof TimeoutError || e instanceof RpcRequestError)) {
      return messages.rpcUnavailable;
    }

    return error.shortMessage ?? error.message;
  }

  if (error instanceof Error) return error.message;
  return messages.unknown;
}
