import { transactions, Transaction } from "./data";

export type { Transaction };

export type TransactionQuery = {
  where?: {
    search?: string;
    account?: string;
    status?: Transaction["status"];
  };
  limit?: number;
  offset?: number;
};

export type TransactionQueryResult = {
  rows: Transaction[];
  total: number;
};

export function queryTransactions({
  where,
  limit = 100,
  offset = 0,
}: TransactionQuery): TransactionQueryResult {
  let filtered = transactions;

  if (where) {
    if (where.status) {
      filtered = filtered.filter(t => t.status === where.status);
    }
    if (where.search) {
      const s = where.search.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.description.toLowerCase().includes(s) ||
          t.category.toLowerCase().includes(s) ||
          t.payee.toLowerCase().includes(s)
      );
    }
    // Add more where conditions as needed
  }

  const total = filtered.length;
  const rows = filtered.slice(offset, offset + limit);

  return { rows, total };
} 