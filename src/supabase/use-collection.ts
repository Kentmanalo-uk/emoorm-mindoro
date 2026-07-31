'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from './provider';

export interface SupabaseQueryConfig {
  table: string;
  columns?: string;
  filters?: Array<{ column: string; op: FilterOp; value: any }>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'ilike' | 'is';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * React hook to subscribe to a Supabase table/query with real-time updates.
 * Pass a SupabaseQueryConfig object (or null/undefined to skip).
 * Memoize the config with useMemo/useStableMemo for stability.
 */
export function useCollection<T = any>(
  config: SupabaseQueryConfig | null | undefined
): UseCollectionResult<T> {
  const supabase = useSupabase();
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Serialize config to detect content changes
  const configKey = config ? JSON.stringify(config) : null;

  useEffect(() => {
    if (!config || !configKey) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        let query = supabase.from(config.table).select(config.columns || '*');

        if (config.filters) {
          for (const filter of config.filters) {
            query = query.filter(filter.column, filter.op, filter.value);
          }
        }

        if (config.order) {
          query = query.order(config.order.column, { ascending: config.order.ascending ?? true });
        }

        if (config.limit) {
          query = query.limit(config.limit);
        }

        const { data: rows, error: fetchError } = await query;

        if (cancelled) return;

        if (fetchError) {
          setError(new Error(fetchError.message));
          setData(null);
        } else {
          setData((rows as unknown as WithId<T>[]) ?? []);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time changes for this table
    const channelName = `collection-${config.table}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: config.table },
        () => {
          if (!cancelled) fetchData();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, supabase]);

  return { data, isLoading, error };
}
