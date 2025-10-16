import { useCallback, useEffect, useRef, useState } from "react";
import { queryTransactions, Transaction, TransactionQuery } from "../backend";

export function useTransactionQuery(
  initialQuery: TransactionQuery,
  page: number,
  pageSize: number = 10,
  chunkSize: number = 10
) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const [loading, setLoading] = useState(false);

  // For resetting state on query change
  const prevQueryRef = useRef<string>("");

  // Helper to stringify query for comparison
  const queryKey = JSON.stringify(query);

  // Fetch a chunk (limit configurable)
  const fetchChunk = useCallback(
    (offset: number, append: boolean) => {
      console.log(
        `[useTransactionQuery] Querying backend API: offset=${offset}, limit=${chunkSize}, where=`,
        query.where
      );
      setLoading(true);
      const { rows, total } = queryTransactions({
        ...query,
        limit: chunkSize,
        offset,
      });
      setTotal(total);
      setIsLastPage(offset + chunkSize >= total);
      setData(prev =>
        append ? [...prev, ...rows] : rows
      );
      setLoading(false);
    },
    [query, chunkSize]
  );

  // Initial load or query change
  useEffect(() => {
    if (prevQueryRef.current !== queryKey) {
      setData([]);
      fetchChunk(0, false);
      prevQueryRef.current = queryKey;
    }
  }, [queryKey, fetchChunk]);

  // Observer: fetch more if needed
  useEffect(() => {
    const needed = (page + 1) * pageSize;
    if (needed > data.length && !isLastPage) {
      console.log(
        `[useTransactionQuery] Observer: need more data for page ${page}, have ${data.length}, need ${needed}`
      );
      fetchChunk(data.length, true);
    }
  }, [page, pageSize, data.length, isLastPage, fetchChunk]);

  // Get current page data
  const pageData = data.slice(page * pageSize, (page + 1) * pageSize);

  // Reset and set new query (filtered/unfiltered)
  const resetQuery = (newQuery: TransactionQuery) => {
    setQuery(newQuery);
  };

  // For changing page size
  const setPageSize = (_size: number) => {
    // no-op, handled in parent
  };

  return {
    data: pageData,
    total,
    pageSize,
    setPageSize,
    isLastPage,
    loading,
    resetQuery,
  };
} 