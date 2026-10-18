// Translates Solana errors into readable messages — the equivalent of src/lib/web3/errors.ts.
//
// The program's errors are mapped by name in the dictionary (chainErrors.solana.custom); a new
// rule in the program that isn't mapped yet falls back to the message in the IDL itself (the
// Portuguese text of error.rs), so it never shows up as a raw code. Imports nothing from React:
// used on the client (the Solana hooks) and on the server (publication check).
import idlJson from "./idl/niara_pmes_solana.json";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type IdlError = { code: number; name: string; msg?: string };
const PROGRAM_ERRORS: IdlError[] = (idlJson as { errors?: IdlError[] }).errors ?? [];

export type SolanaErrorMessages = Dictionary["chainErrors"]["solana"];

/** Errors raised by the client code itself (phantom.ts) before anything reaches the network. */
export class SolanaClientError extends Error {
  constructor(public readonly code: "no-wallet" | "not-connected" | "no-signature") {
    super(code);
    this.name = "SolanaClientError";
  }
}

function byName(name: string, messages: SolanaErrorMessages): string | null {
  const custom: Record<string, string> = messages.custom;
  if (custom[name]) return custom[name];
  return PROGRAM_ERRORS.find((e) => e.name === name)?.msg ?? null;
}

function byCode(code: number, messages: SolanaErrorMessages): string | null {
  const error = PROGRAM_ERRORS.find((e) => e.code === code);
  return error ? byName(error.name, messages) : null;
}

function textOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function logsOf(error: unknown): string[] {
  const logs = (error as { logs?: unknown })?.logs;
  return Array.isArray(logs) ? logs.map(String) : [];
}

export function describeSolanaError(error: unknown, messages: SolanaErrorMessages): string {
  if (error instanceof SolanaClientError) {
    if (error.code === "no-wallet") return messages.noWallet;
    if (error.code === "not-connected") return messages.notConnected;
    return messages.noSignature;
  }
  const walletCode = (error as { code?: number })?.code;
  const text = textOf(error);

  if (walletCode === 4001 || /user rejected|rejected the request/i.test(text)) {
    return messages.signatureRejected;
  }

  const logs = logsOf(error);
  const everything = [text, ...logs].join("\n");

  // Standard Anchor log: "AnchorError ... Error Code: Name. Error Number: 6xxx. Error Message: ..."
  const anchor = /Error Code: (\w+)\./.exec(everything);
  if (anchor) {
    const msg = byName(anchor[1], messages);
    if (msg) return msg;
  }

  // InstructionError with a custom code (no Anchor log).
  const custom = (error as { err?: { InstructionError?: [number, { Custom?: number } | string] } })?.err?.InstructionError?.[1];
  if (custom && typeof custom === "object" && typeof custom.Custom === "number") {
    const msg = byCode(custom.Custom, messages);
    if (msg) return msg;
  }
  const hexCustom = /custom program error: 0x([0-9a-f]+)/i.exec(everything);
  if (hexCustom) {
    const msg = byCode(parseInt(hexCustom[1], 16), messages);
    if (msg) return msg;
  }

  if (/Program Tokenkeg\S+ failed: custom program error: 0x1\b|insufficient funds/i.test(everything) && /Tokenkeg/.test(everything)) {
    return messages.insufficientMockBrl;
  }
  if (/no record of a prior credit|insufficient lamports|insufficient funds for rent/i.test(everything)) {
    return messages.insufficientSol;
  }
  if (/block height exceeded|blockhash not found|expired/i.test(everything)) {
    return messages.expired;
  }
  if (/failed to fetch|network|timeout|429/i.test(everything)) {
    return messages.networkUnavailable;
  }
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}
