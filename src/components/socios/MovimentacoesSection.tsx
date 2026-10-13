import { getTransactionsAndSummary } from "@/lib/socios/movimentacoes";
import { TransactionsTable } from "./MovimentacoesTable";
import { SummaryCards } from "./ResumoCards";

// An async component isolated only so it sits behind page.tsx's <Suspense> (same reason as
// before: the on-chain read, inside getTransactionsAndSummary(), can take a while without a
// dedicated RPC). getTransactionsAndSummary() never throws — each source (on-chain, sign-ups,
// offerings, investments, payment_events) has its own internal catch (see
// src/lib/socios/movimentacoes.ts), so an isolated failure only drops that source from the
// timeline, never the page.
export async function TransactionsSection() {
  const { transactions, summary } = await getTransactionsAndSummary();
  return (
    <>
      <SummaryCards summary={summary} />
      <TransactionsTable transactions={transactions} />
    </>
  );
}
