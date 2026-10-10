// Tradução de erros da Solana para mensagens legíveis — equivalente de src/lib/web3/errors.ts.
//
// Os erros do programa vêm do próprio IDL (mesmas mensagens em português de error.rs), então uma
// regra nova no programa já aparece traduzida aqui só copiando o IDL. Não importa nada de React:
// usado no cliente (phantom.ts) e no servidor (verificação de publicação).
import idlJson from "./idl/niara_pmes_solana.json";

type ErroIdl = { code: number; name: string; msg?: string };
const ERROS_PROGRAMA: ErroIdl[] = (idlJson as { errors?: ErroIdl[] }).errors ?? [];

/** Mensagens mais completas para os erros que o usuário encontra no fluxo normal. */
const MENSAGENS: Record<string, string> = {
  AporteNaoMultiploDoPreco: "O aporte precisa ser um múltiplo exato do preço por cota.",
  ExcedeMetaMaxima: "Esse aporte ultrapassa a meta máxima da oferta.",
  ExcedeTetoInvestidor: "Esse aporte ultrapassa o teto por investidor desta oferta.",
  OfertaPausada: "Esta oferta está pausada pela plataforma — aportes bloqueados por enquanto.",
  PrazoExpirado: "O prazo desta oferta já terminou — não aceita mais aportes.",
  OfertaNaoAberta: "Esta oferta não está mais aberta.",
  EncerramentoPrematuro: "Só é possível encerrar antes do prazo se a meta máxima tiver sido atingida exatamente.",
  EmissorNaoAutorizado: "Esta carteira ainda não está autorizada como emissora no programa — peça à equipe Niara para autorizá-la.",
  OfertaAnteriorAindaAberta: "Esta carteira já tem uma oferta aberta na Solana — encerre-a antes de publicar outra.",
  LoteAdicionalExcedeLimite: "Lote adicional acima de 25% da meta mínima (Res. CVM 88).",
  MetaMaximaExcedeTeto: "Meta máxima acima de R$ 15 milhões (Res. CVM 88).",
  PrazoExcedeLimite: "Prazo no passado ou acima de 180 dias (Res. CVM 88).",
  PrecoNaoDivideMetaMaxima: "O valor por cota precisa dividir exatamente a meta máxima.",
};

function porNome(nome: string): string | null {
  if (MENSAGENS[nome]) return MENSAGENS[nome];
  return ERROS_PROGRAMA.find((e) => e.name === nome)?.msg ?? null;
}

function porCodigo(codigo: number): string | null {
  const erro = ERROS_PROGRAMA.find((e) => e.code === codigo);
  return erro ? porNome(erro.name) : null;
}

function textoDe(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === "string") return erro;
  try {
    return JSON.stringify(erro);
  } catch {
    return String(erro);
  }
}

function logsDe(erro: unknown): string[] {
  const logs = (erro as { logs?: unknown })?.logs;
  return Array.isArray(logs) ? logs.map(String) : [];
}

export function descreverErroSolana(erro: unknown): string {
  const codigoCarteira = (erro as { code?: number })?.code;
  const texto = textoDe(erro);

  if (codigoCarteira === 4001 || /user rejected|rejected the request/i.test(texto)) {
    return "Assinatura recusada na carteira.";
  }

  const logs = logsDe(erro);
  const tudo = [texto, ...logs].join("\n");

  // Log padrão do Anchor: "AnchorError ... Error Code: Nome. Error Number: 6xxx. Error Message: ..."
  const anchor = /Error Code: (\w+)\./.exec(tudo);
  if (anchor) {
    const msg = porNome(anchor[1]);
    if (msg) return msg;
  }

  // InstructionError com código customizado (sem log do Anchor).
  const custom = (erro as { err?: { InstructionError?: [number, { Custom?: number } | string] } })?.err?.InstructionError?.[1];
  if (custom && typeof custom === "object" && typeof custom.Custom === "number") {
    const msg = porCodigo(custom.Custom);
    if (msg) return msg;
  }
  const hexCustom = /custom program error: 0x([0-9a-f]+)/i.exec(tudo);
  if (hexCustom) {
    const msg = porCodigo(parseInt(hexCustom[1], 16));
    if (msg) return msg;
  }

  if (/Program Tokenkeg\S+ failed: custom program error: 0x1\b|insufficient funds/i.test(tudo) && /Tokenkeg/.test(tudo)) {
    return "Saldo de MockBRL insuficiente — use o faucet acima.";
  }
  if (/no record of a prior credit|insufficient lamports|insufficient funds for rent/i.test(tudo)) {
    return "Saldo de SOL insuficiente para pagar a taxa da rede — obtenha SOL de teste em faucet.solana.com (devnet).";
  }
  if (/block height exceeded|blockhash not found|expired/i.test(tudo)) {
    return "A transação expirou antes de ser confirmada — tente de novo.";
  }
  if (/failed to fetch|network|timeout|429/i.test(tudo)) {
    return "Não foi possível falar com a rede Solana (devnet) agora — tente de novo em alguns segundos.";
  }
  return texto.length > 300 ? `${texto.slice(0, 300)}…` : texto;
}
