import { getTransactionsAndSummary } from "@/lib/socios/movimentacoes";
import { TransactionsTable } from "./MovimentacoesTable";
import { SummaryCards } from "./ResumoCards";

// Componente assíncrono isolado só para ficar atrás do <Suspense> de page.tsx (mesmo motivo de
// antes: a leitura on-chain, dentro de getMovimentacoesEResumo(), pode demorar sem uma RPC
// dedicada). getMovimentacoesEResumo() nunca lança — cada fonte (on-chain, cadastros, ofertas,
// aportes, payment_events) tem seu próprio catch interno (ver
// src/lib/socios/movimentacoes.ts), então uma falha isolada só tira aquela fonte da timeline,
// nunca derruba a página.
export async function TransactionsSection() {
  const { movimentacoes: transactions, resumo: summary } = await getTransactionsAndSummary();
  return (
    <>
      <SummaryCards summary={summary} />
      <TransactionsTable transactions={transactions} />
    </>
  );
}
